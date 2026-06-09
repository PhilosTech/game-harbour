import type { SessionErrorCode } from '@/server/sessions';

export type JoinErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'SESSION_ENDED'
  | 'NAME_NOT_IN_SESSION'
  | 'INVALID_INPUT'
  | 'UNKNOWN';

export function mapSessionErrorCode(code: SessionErrorCode): JoinErrorCode {
  switch (code) {
    case 'NOT_FOUND':
      return 'SESSION_NOT_FOUND';
    case 'ENDED':
      return 'SESSION_ENDED';
    case 'NAME_NOT_IN_SESSION':
      return 'NAME_NOT_IN_SESSION';
    case 'INVALID':
      return 'INVALID_INPUT';
    default:
      return 'UNKNOWN';
  }
}
