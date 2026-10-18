import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import {
  validateImageFile,
  generateSafeImageFileName,
  isLocalUploadedImage,
  safeDeleteUploadedImage,
  getImageStorageDir,
  MAX_IMAGE_SIZE_BYTES,
} from '../src/lib/image-upload';
import { prisma } from '../src/lib/prisma';

test('Project Image Upload & Storage System', async (t) => {
  await t.test('Successful image file validation for supported image types', () => {
    const validJpg = validateImageFile({
      name: 'screenshot.jpg',
      size: 1024 * 500, // 500 KB
      type: 'image/jpeg',
    });
    assert.equal(validJpg.valid, true);
    assert.equal(validJpg.error, undefined);

    const validPng = validateImageFile({
      name: 'diagram.png',
      size: 1024 * 1024 * 2, // 2 MB
      type: 'image/png',
    });
    assert.equal(validPng.valid, true);

    const validWebp = validateImageFile({
      name: 'hero-banner.webp',
      size: 1024 * 800, // 800 KB
      type: 'image/webp',
    });
    assert.equal(validWebp.valid, true);

    const validJpeg = validateImageFile({
      name: 'photo.JPEG',
      size: 1024 * 300,
      type: 'image/jpeg',
    });
    assert.equal(validJpeg.valid, true);
  });

  await t.test('Rejects invalid file extensions (executables, scripts, pdfs, svgs)', () => {
    const invalidExe = validateImageFile({
      name: 'malware.exe',
      size: 1024 * 100,
      type: 'application/x-msdownload',
    });
    assert.equal(invalidExe.valid, false);
    assert.ok(invalidExe.error?.includes('Unsupported image format'));

    const invalidPdf = validateImageFile({
      name: 'report.pdf',
      size: 1024 * 200,
      type: 'application/pdf',
    });
    assert.equal(invalidPdf.valid, false);

    const invalidSvg = validateImageFile({
      name: 'vector.svg',
      size: 1024 * 50,
      type: 'image/svg+xml',
    });
    assert.equal(invalidSvg.valid, false);

    const invalidPhp = validateImageFile({
      name: 'shell.php',
      size: 1024 * 10,
    });
    assert.equal(invalidPhp.valid, false);
  });

  await t.test('Rejects oversized image files exceeding 5MB limit', () => {
    assert.equal(MAX_IMAGE_SIZE_BYTES, 5 * 1024 * 1024);

    const oversizedFile = validateImageFile({
      name: 'huge-raw-image.png',
      size: 6 * 1024 * 1024, // 6 MB
      type: 'image/png',
    });
    assert.equal(oversizedFile.valid, false);
    assert.ok(oversizedFile.error?.includes('exceeds maximum allowed 5 MB limit'));

    const zeroByteFile = validateImageFile({
      name: 'empty.jpg',
      size: 0,
      type: 'image/jpeg',
    });
    assert.equal(zeroByteFile.valid, false);
    assert.ok(zeroByteFile.error?.includes('0 bytes'));
  });

  await t.test('Safe filename generator creates secure, randomized filenames with correct extensions', () => {
    const name1 = generateSafeImageFileName('../../malicious-path/test.png');
    assert.ok(name1.startsWith('proj_'));
    assert.ok(name1.endsWith('.png'));
    assert.ok(!name1.includes('..'));
    assert.ok(!name1.includes('/'));
    assert.ok(!name1.includes('\\'));

    const name2 = generateSafeImageFileName('photo.WEBP');
    assert.ok(name2.endsWith('.webp'));

    const name3 = generateSafeImageFileName('my photo name with spaces.jpg');
    assert.ok(name3.endsWith('.jpg'));
    assert.ok(!name3.includes(' '));
  });

  await t.test('Directory traversal protection & safe local upload checking', () => {
    assert.equal(isLocalUploadedImage('/uploads/projects/proj_12345.png'), true);
    assert.equal(isLocalUploadedImage('https://images.unsplash.com/photo-123'), false);
    assert.equal(isLocalUploadedImage('/etc/passwd'), false);
    assert.equal(isLocalUploadedImage(null), false);
    assert.equal(isLocalUploadedImage(''), false);

    // Traversal attempts must return false immediately
    assert.equal(safeDeleteUploadedImage('/uploads/projects/../../dev.db'), false);
    assert.equal(safeDeleteUploadedImage('https://evil.com/image.jpg'), false);
    assert.equal(safeDeleteUploadedImage(null), false);
  });

  await t.test('Image replacement & physical file deletion', () => {
    const storageDir = getImageStorageDir();
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    const testFileName = `test_temp_replace_${Date.now()}.jpg`;
    const testFilePath = path.join(storageDir, testFileName);
    fs.writeFileSync(testFilePath, Buffer.from('test-image-binary-data'));

    assert.equal(fs.existsSync(testFilePath), true);

    const publicUrl = `/uploads/projects/${testFileName}`;
    const deleted = safeDeleteUploadedImage(publicUrl);

    assert.equal(deleted, true);
    assert.equal(fs.existsSync(testFilePath), false);
  });

  await t.test('Image URL persistence in SQLite Project database (CRUD & zero binary in DB)', async () => {
    const testSlug = `test-image-project-${Date.now()}`;
    const testMainImage = `/uploads/projects/proj_test_main_${Date.now()}.png`;
    const testArchImage = `/uploads/projects/proj_test_arch_${Date.now()}.jpg`;
    const testGallery = [
      `/uploads/projects/proj_test_gal1_${Date.now()}.webp`,
      `/uploads/projects/proj_test_gal2_${Date.now()}.png`,
      'https://images.unsplash.com/photo-1518770660439-4636190af475',
    ];

    // 1. Create project with local uploaded image URLs
    const created = await prisma.project.create({
      data: {
        title: 'Image Test Benchmark Project',
        slug: testSlug,
        shortDescription: 'Testing uploaded image URL persistence',
        fullDescription: 'Verifying full CRUD persistence of uploaded assets',
        category: 'Artificial Intelligence',
        technologies: JSON.stringify(['Python', 'PyTorch']),
        difficulty: 'Advanced',
        projectType: 'Major',
        mainImage: testMainImage,
        architectureImage: testArchImage,
        gallery: JSON.stringify(testGallery),
        available: true,
        published: true,
        salesType: 'fixed',
        price: 2999,
      },
    });

    assert.ok(created.id);
    assert.equal(created.mainImage, testMainImage);
    assert.equal(created.architectureImage, testArchImage);

    // 2. Query and verify persistence
    const fetched = await prisma.project.findUnique({
      where: { id: created.id },
    });
    assert.ok(fetched);
    assert.equal(fetched.mainImage, testMainImage);
    const parsedGallery = JSON.parse(fetched.gallery || '[]');
    assert.equal(parsedGallery.length, 3);
    assert.equal(parsedGallery[0], testGallery[0]);

    // 3. Replace image and update
    const updatedMainImage = `/uploads/projects/proj_test_replaced_${Date.now()}.jpg`;
    const updated = await prisma.project.update({
      where: { id: created.id },
      data: { mainImage: updatedMainImage },
    });
    assert.equal(updated.mainImage, updatedMainImage);

    // 4. Clean up test record to maintain 0 dummy projects rule
    await prisma.project.delete({
      where: { id: created.id },
    });

    const finalCount = await prisma.project.count({
      where: { id: created.id },
    });
    assert.equal(finalCount, 0);
  });
});
