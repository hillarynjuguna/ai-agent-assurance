import { createHash } from 'crypto';

export function hashTrackDExport(json: string): string {
  return createHash('sha256').update(json).digest('hex');
}
