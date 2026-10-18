import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEnquiryInput } from '../src/lib/validation';

test('Enquiry & Lead Creation Validation', async (t) => {
  const validPayload = {
    studentName: 'Subash Mahendran',
    college: 'Anna University',
    department: 'Computer Science and Engineering',
    year: 'Final Year',
    phone: '+91 98765 43210',
    whatsapp: '9876543210',
    email: 'student@example.edu',
    requirements: 'Need source code with complete IEEE format report and presentation slides.',
    domain: 'Artificial Intelligence',
    technology: 'Python, PyTorch',
  };

  await t.test('validateEnquiryInput accepts valid input and sanitizes fields', () => {
    const result = validateEnquiryInput(validPayload);
    assert.equal(result.isValid, true);
    assert.ok(result.sanitized);
    assert.equal(result.sanitized?.studentName, 'Subash Mahendran');
    assert.equal(result.sanitized?.phone, '+919876543210');
    assert.equal(result.sanitized?.email, 'student@example.edu');
  });

  await t.test('validateEnquiryInput rejects missing required fields', () => {
    const missingName = { ...validPayload, studentName: '   ' };
    assert.equal(validateEnquiryInput(missingName).isValid, false);

    const missingRequirements = { ...validPayload, requirements: '  ' };
    assert.equal(validateEnquiryInput(missingRequirements).isValid, false);

    const missingPhone = { ...validPayload, phone: '' };
    assert.equal(validateEnquiryInput(missingPhone).isValid, false);
  });

  await t.test('validateEnquiryInput allows optional college and department, providing sensible fallbacks', () => {
    const noCollegeOrDept = { ...validPayload, college: '', department: '' };
    const res = validateEnquiryInput(noCollegeOrDept);
    assert.equal(res.isValid, true);
    assert.equal(res.sanitized?.college, 'Individual/Self');
    assert.equal(res.sanitized?.department, 'General');
  });

  await t.test('validateEnquiryInput rejects invalid email addresses', () => {
    const invalidEmail1 = { ...validPayload, email: 'not-an-email' };
    assert.equal(validateEnquiryInput(invalidEmail1).isValid, false);

    const invalidEmail2 = { ...validPayload, email: 'missingdomain@' };
    assert.equal(validateEnquiryInput(invalidEmail2).isValid, false);
  });

  await t.test('validateEnquiryInput rejects phone numbers with less than 10 digits', () => {
    const shortPhone = { ...validPayload, phone: '12345' };
    const res = validateEnquiryInput(shortPhone);
    assert.equal(res.isValid, false);
    assert.match(res.error || '', /10-digit phone number/);
  });

  await t.test('validateEnquiryInput defaults whatsapp to phone if not provided', () => {
    const payloadNoWhatsapp: Record<string, string | undefined> = { ...validPayload };
    delete payloadNoWhatsapp.whatsapp;
    const result = validateEnquiryInput(payloadNoWhatsapp);
    assert.equal(result.isValid, true);
    assert.equal(result.sanitized?.whatsapp, result.sanitized?.phone);
  });
});
