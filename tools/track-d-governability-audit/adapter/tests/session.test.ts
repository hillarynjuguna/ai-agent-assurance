/**
 * Test suite for Task 2: Server-Side Mock Reviewer Session Boundary
 * 
 * Verifies that reviewer identity and role are resolved server-side from configuration/environment,
 * and never trusted from client input.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getServerReviewerSession, type ReviewerSession } from '../src/index';

describe('Phase 6: Server-Side Reviewer Session Boundary', () => {
  it('resolves default mock reviewer session when environment variables are unset', () => {
    const originalId = process.env.DEV_REVIEWER_ID;
    const originalRole = process.env.DEV_REVIEWER_ROLE;
    const originalName = process.env.DEV_REVIEWER_NAME;

    delete process.env.DEV_REVIEWER_ID;
    delete process.env.DEV_REVIEWER_ROLE;
    delete process.env.DEV_REVIEWER_NAME;

    try {
      const session: ReviewerSession = getServerReviewerSession();

      assert.equal(session.reviewerId, 'rev-dev-default');
      assert.equal(session.reviewerName, 'Internal Development Validator');
      assert.equal(session.role, 'internal_validator');
      assert.equal(session.isDevMock, true);
      assert.ok(session.sessionStartedAt);
      assert.ok(new Date(session.sessionStartedAt).getTime() > 0);
    } finally {
      if (originalId) process.env.DEV_REVIEWER_ID = originalId;
      if (originalRole) process.env.DEV_REVIEWER_ROLE = originalRole;
      if (originalName) process.env.DEV_REVIEWER_NAME = originalName;
    }
  });

  it('resolves configured reviewer session from server-side environment', () => {
    const originalId = process.env.DEV_REVIEWER_ID;
    const originalRole = process.env.DEV_REVIEWER_ROLE;
    const originalName = process.env.DEV_REVIEWER_NAME;

    process.env.DEV_REVIEWER_ID = 'rev-evan-01';
    process.env.DEV_REVIEWER_NAME = 'Evan Security Auditor';
    process.env.DEV_REVIEWER_ROLE = 'human_validator';

    try {
      const session: ReviewerSession = getServerReviewerSession();

      assert.equal(session.reviewerId, 'rev-evan-01');
      assert.equal(session.reviewerName, 'Evan Security Auditor');
      assert.equal(session.role, 'human_validator');
      assert.equal(session.isDevMock, true);
    } finally {
      if (originalId) process.env.DEV_REVIEWER_ID = originalId; else delete process.env.DEV_REVIEWER_ID;
      if (originalRole) process.env.DEV_REVIEWER_ROLE = originalRole; else delete process.env.DEV_REVIEWER_ROLE;
      if (originalName) process.env.DEV_REVIEWER_NAME = originalName; else delete process.env.DEV_REVIEWER_NAME;
    }
  });

  it('rejects invalid role configuration gracefully with fallback to internal_validator', () => {
    const originalRole = process.env.DEV_REVIEWER_ROLE;
    process.env.DEV_REVIEWER_ROLE = 'unauthorized_superadmin_hacker' as any;

    try {
      const session = getServerReviewerSession();
      // Invalid role should be rejected and fall back safely
      assert.equal(session.role, 'internal_validator');
    } finally {
      if (originalRole) process.env.DEV_REVIEWER_ROLE = originalRole; else delete process.env.DEV_REVIEWER_ROLE;
    }
  });
});
