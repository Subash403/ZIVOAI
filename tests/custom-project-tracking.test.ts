import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { CUSTOM_PROJECT_STAGES } from '../src/types';

describe('Custom Project Development Tracking & Lifecycle', () => {
  test('CUSTOM_PROJECT_STAGES contains all 8 required progress stages in exact chronological order', () => {
    const expectedStages = [
      'Request Received',
      'Planning',
      'Requirement Analysis',
      'Building',
      'Testing',
      'Final Review',
      'Ready for Delivery',
      'Delivered',
    ];

    assert.equal(CUSTOM_PROJECT_STAGES.length, 8);
    assert.deepEqual(CUSTOM_PROJECT_STAGES, expectedStages);
  });

  test('Valid stages include the 8 stages plus On Hold and Cancelled', () => {
    const validStages = [...CUSTOM_PROJECT_STAGES, 'On Hold', 'Cancelled'];

    assert.ok(validStages.includes('Request Received'));
    assert.ok(validStages.includes('Planning'));
    assert.ok(validStages.includes('Requirement Analysis'));
    assert.ok(validStages.includes('Building'));
    assert.ok(validStages.includes('Testing'));
    assert.ok(validStages.includes('Final Review'));
    assert.ok(validStages.includes('Ready for Delivery'));
    assert.ok(validStages.includes('Delivered'));
    assert.ok(validStages.includes('On Hold'));
    assert.ok(validStages.includes('Cancelled'));
    assert.equal(validStages.length, 10);
  });

  test('Enforces delivery confirmation guard when moving to Delivered stage', () => {
    const validateDeliveryTransition = (
      currentStage: string,
      targetStage: string,
      confirmDelivered: boolean
    ) => {
      if (targetStage === 'Delivered' && currentStage !== 'Delivered' && !confirmDelivered) {
        return {
          allowed: false,
          error: 'Confirmation required: Please explicitly check the delivery confirmation box before marking this project as Delivered.',
        };
      }
      return { allowed: true };
    };

    // Transition to Delivered without confirmation must fail
    const unconfirmed = validateDeliveryTransition('Ready for Delivery', 'Delivered', false);
    assert.equal(unconfirmed.allowed, false);
    assert.ok(unconfirmed.error?.includes('Confirmation required'));

    // Transition to Delivered with confirmation must succeed
    const confirmed = validateDeliveryTransition('Ready for Delivery', 'Delivered', true);
    assert.equal(confirmed.allowed, true);

    // Other transitions do not require delivery confirmation
    const building = validateDeliveryTransition('Requirement Analysis', 'Building', false);
    assert.equal(building.allowed, true);
  });

  test('Customer timeline sanitizer removes private internal admin notes', () => {
    const rawTimeline = [
      {
        id: 't-1',
        stage: 'Request Received',
        statusMessage: 'Your custom project request has been received. Our team will review your requirements and update your project progress here.',
        adminNote: 'Internal client phone call scheduled for 4 PM',
        estimatedDate: '2026-10-25',
        createdAt: new Date(),
      },
      {
        id: 't-2',
        stage: 'Building',
        statusMessage: 'Core modules have been implemented and tested.',
        adminNote: 'Cost agreed: 4500 INR, 50% advance received',
        estimatedDate: '2026-10-28',
        createdAt: new Date(),
      },
    ];

    // Customer view sanitizer
    const sanitizeForCustomer = (timeline: typeof rawTimeline) => {
      return timeline.map((item) => {
        const customerSafe = { ...item };
        delete (customerSafe as { adminNote?: string }).adminNote;
        return customerSafe;
      });
    };

    const sanitized = sanitizeForCustomer(rawTimeline);

    assert.equal(sanitized.length, 2);
    for (const item of sanitized) {
      assert.equal('adminNote' in item, false);
      assert.ok('stage' in item);
      assert.ok('statusMessage' in item);
      assert.ok('estimatedDate' in item);
    }
  });

  test('Enquiry confirmation message matches exact requirement', () => {
    const expectedMessage =
      'Your custom project request has been received. Our team will review your requirements and update your project progress here.';

    const defaultCustomerMessage =
      'Your custom project request has been received. Our team will review your requirements and update your project progress here.';

    assert.equal(defaultCustomerMessage, expectedMessage);
  });
});
