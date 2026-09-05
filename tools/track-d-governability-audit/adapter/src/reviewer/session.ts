/**
 * Server-side reviewer session resolver.
 * 
 * Invariant: Never trust client-supplied identity or role.
 * In MVP development mode, reviewer identity and role are resolved strictly
 * from server-side environment variables or configuration defaults.
 */

import type { ReviewerRole, ReviewerSession } from './types';

const VALID_ROLES: ReviewerRole[] = [
  'operator',
  'human_validator',
  'specialist_partner',
  'internal_validator'
];

/**
 * Resolves the authenticated reviewer session server-side.
 * In development / MVP, reads from process.env with safe fallbacks.
 * In production, this boundary will be replaced with verified auth session tokens.
 */
export function getServerReviewerSession(): ReviewerSession {
  const envId = process.env.DEV_REVIEWER_ID?.trim();
  const envName = process.env.DEV_REVIEWER_NAME?.trim();
  const envRole = process.env.DEV_REVIEWER_ROLE?.trim() as ReviewerRole | undefined;

  const reviewerId = envId && envId.length > 0 ? envId : 'rev-dev-default';
  const reviewerName = envName && envName.length > 0 ? envName : 'Internal Development Validator';

  const role: ReviewerRole = (envRole && VALID_ROLES.includes(envRole))
    ? envRole
    : 'internal_validator';

  return {
    reviewerId,
    reviewerName,
    role,
    sessionStartedAt: new Date().toISOString(),
    isDevMock: true
  };
}
