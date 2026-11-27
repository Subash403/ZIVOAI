import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { POST as resetDataRoute } from '../src/app/api/admin/system/reset-data/route';
import { prisma } from '../src/lib/prisma';
import {
  signAuthToken,
  ADMIN_TOKEN_COOKIE_NAME,
  CUSTOMER_TOKEN_COOKIE_NAME,
} from '../src/lib/auth';

test('Admin Danger Zone Data Reset API & Security Safeguards', async (t) => {
  const realAdmin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  const customerToken = signAuthToken({
    userId: 'cust_user_456',
    email: 'hacker@example.com',
    name: 'Unauthorized User',
    role: 'CUSTOMER',
  });

  const adminToken = signAuthToken({
    userId: realAdmin?.id || 'admin_user_789',
    email: realAdmin?.email || 'admin@zivo.ai',
    name: realAdmin?.name || 'Super Admin',
    role: 'ADMIN',
  });

  await t.test('Rejects unauthenticated request with 403', async () => {
    const req = new Request('http://localhost:3000/api/admin/system/reset-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        confirmPhrase: 'DELETE ALL DATA',
        adminPassword: 'somepassword',
      }),
    });

    const res = await resetDataRoute(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('Administrator privileges required'));
  });

  await t.test('Rejects customer session with 403', async () => {
    const req = new Request('http://localhost:3000/api/admin/system/reset-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${CUSTOMER_TOKEN_COOKIE_NAME}=${customerToken}`,
      },
      body: JSON.stringify({
        confirmPhrase: 'DELETE ALL DATA',
        adminPassword: 'somepassword',
      }),
    });

    const res = await resetDataRoute(req);
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.ok(body.error.includes('Administrator privileges required'));
  });

  await t.test('Rejects invalid confirmation phrase with 400', async () => {
    const req = new Request('http://localhost:3000/api/admin/system/reset-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        confirmPhrase: 'DELETE DATA',
        adminPassword: 'zivoai@web',
      }),
    });

    const res = await resetDataRoute(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('Confirmation phrase mismatch'));
  });

  await t.test('Rejects missing administrator password with 400', async () => {
    const req = new Request('http://localhost:3000/api/admin/system/reset-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        confirmPhrase: 'DELETE ALL DATA',
        adminPassword: '',
      }),
    });

    const res = await resetDataRoute(req);
    assert.equal(res.status, 400);
    const body = await res.json();
    assert.ok(body.error.includes('password confirmation is required'));
  });

  await t.test('Rejects incorrect administrator password with 401', async () => {
    const req = new Request('http://localhost:3000/api/admin/system/reset-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: `${ADMIN_TOKEN_COOKIE_NAME}=${adminToken}`,
      },
      body: JSON.stringify({
        confirmPhrase: 'DELETE ALL DATA',
        adminPassword: 'wrong-password-12345',
      }),
    });

    const res = await resetDataRoute(req);
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.ok(body.error.includes('Incorrect administrator password'));
  });
});

test('Navbar Services Dropdown & About Navigation Verification', async (t) => {
  const navbarFile = fs.readFileSync(
    path.join(process.cwd(), 'src/components/Navbar.tsx'),
    'utf8'
  );

  await t.test('Navbar defines Services dropdown with all 5 verified application routes', () => {
    assert.match(navbarFile, /name:\s*'Custom Software & AI Development'/);
    assert.match(navbarFile, /href:\s*'\/projects\/custom'/);
    assert.match(navbarFile, /name:\s*'Ready-to-Run Software Catalog'/);
    assert.match(navbarFile, /href:\s*'\/projects\?salesType=fixed'/);
    assert.match(navbarFile, /name:\s*'AI Solution Finder & Matcher'/);
    assert.match(navbarFile, /href:\s*'\/projects\/finder'/);
    assert.match(navbarFile, /name:\s*'Technical Architecture Comparison'/);
    assert.match(navbarFile, /href:\s*'\/projects\/compare'/);
    assert.match(navbarFile, /name:\s*'Live Order & Milestone Tracking'/);
    assert.match(navbarFile, /href:\s*'\/orders\/track'/);
  });

  await t.test('Navbar includes accessible ARIA and hover-bridge timers for dropdowns', () => {
    assert.match(navbarFile, /aria-expanded=\{servicesMenuOpen\}/);
    assert.match(navbarFile, /aria-haspopup="menu"/);
    assert.match(navbarFile, /servicesHoverTimerRef/);
    assert.match(navbarFile, /handleServicesMouseEnter/);
    assert.match(navbarFile, /handleServicesMouseLeave/);
  });

  await t.test('About button links to /about and handles homepage smooth scrolling', () => {
    assert.match(navbarFile, /href="\/about"/);
    assert.match(navbarFile, /handleAboutClick/);
    assert.match(navbarFile, /el\.scrollIntoView/);
  });

  await t.test('Dedicated /about page exists and exports valid metadata and content', () => {
    const aboutPagePath = path.join(process.cwd(), 'src/app/about/page.tsx');
    assert.ok(fs.existsSync(aboutPagePath));
    const aboutContent = fs.readFileSync(aboutPagePath, 'utf8');
    assert.match(aboutContent, /export const metadata/);
    assert.match(aboutContent, /About Us \| Zivo AI/);
    assert.match(aboutContent, /export default function AboutPage/);
  });

  await t.test('Homepage section includes id="about" with compatibility id="why-zivo"', () => {
    const homepageFile = fs.readFileSync(
      path.join(process.cwd(), 'src/app/page.tsx'),
      'utf8'
    );
    assert.match(homepageFile, /id="about"/);
    assert.match(homepageFile, /id="why-zivo"/);
  });

  await t.test('Mobile menu includes body scroll lock and escape closing', () => {
    assert.match(navbarFile, /document\.body\.style\.overflow\s*=\s*'hidden'/);
    assert.match(navbarFile, /e\.key === 'Escape'/);
    assert.match(navbarFile, /mobileServicesOpen/);
  });
});

test('Generative AI Service Card Stability & Anti-Flicker Verification', async (t) => {
  const bentoFile = fs.readFileSync(
    path.join(process.cwd(), 'src/components/CapabilitiesBento.tsx'),
    'utf8'
  );

  await t.test('Icon container uses text-[#0089CF] and transparent background across all states', () => {
    // Verified card icon container must not have style={{ color: featured.accentColor }} that overrides colors
    assert.doesNotMatch(
      bentoFile,
      /style=\{\{\s*color:\s*featured\.accentColor\s*\}\}/,
      'Inline style overriding text color must be removed from featured card'
    );
    assert.match(bentoFile, /text-\[#0089CF\]/);
    assert.match(bentoFile, /bg-transparent/);
    assert.doesNotMatch(bentoFile, /group-hover:bg-\[#0089CF\]/);
  });

  await t.test('Featured card includes motion-reduce and focus-visible accessibility classes', () => {
    assert.match(bentoFile, /motion-reduce:transition-none/);
    assert.match(bentoFile, /motion-reduce:hover:transform-none/);
    assert.match(bentoFile, /focus-visible:ring-\[#0089CF\]/);
  });
});
