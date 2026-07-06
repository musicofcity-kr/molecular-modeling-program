import { createHash, timingSafeEqual } from 'node:crypto';

export const JOIN_CODE_HASH_VERSION = 2;
export const LEGACY_JOIN_CODE_HASH_VERSION = 1;

export function normalizeJoinCode(value: unknown): string {
  return typeof value === 'string'
    ? value.trim().replace(/\s+/g, '').toUpperCase().slice(0, 32)
    : '';
}

export function normalizeJoinClassCode(value: unknown): string {
  return typeof value === 'string'
    ? value
        .trim()
        .replace(/[\\/]+/g, '-')
        .replace(/\s+/g, '-')
        .toUpperCase()
        .slice(0, 24)
    : '';
}

export function buildJoinCodeHash(input: {
  classCode: string;
  joinCode: string;
}): string {
  const classCode = normalizeJoinClassCode(input.classCode);
  const joinCode = normalizeJoinCode(input.joinCode);

  if (!classCode || !joinCode) {
    return '';
  }

  return `server-join-code-v2-${createHash('sha256')
    .update(`${classCode}:${joinCode}`, 'utf8')
    .digest('hex')}`;
}

export function buildLegacyJoinCodeHash(input: {
  classCode: string;
  joinCode: string;
}): string {
  const classCode = normalizeJoinClassCode(input.classCode);
  const joinCode = normalizeJoinCode(input.joinCode);

  if (!classCode || !joinCode) {
    return '';
  }

  return `client-join-code-v1-${fnv1a(`${classCode}:${joinCode}`)}`;
}

export function isJoinCodeHashAccepted(input: {
  storedHash: unknown;
  joinCodeVersion: unknown;
  classCode: string;
  joinCode: string;
}): boolean {
  if (typeof input.storedHash !== 'string') {
    return false;
  }

  const expectedHash =
    input.joinCodeVersion === JOIN_CODE_HASH_VERSION
      ? buildJoinCodeHash(input)
      : buildLegacyJoinCodeHash(input);

  return safeEqualHash(input.storedHash, expectedHash);
}

function safeEqualHash(actual: string, expected: string): boolean {
  if (!actual || !expected) {
    return false;
  }

  const actualBuffer = Buffer.from(actual, 'utf8');
  const expectedBuffer = Buffer.from(expected, 'utf8');

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
