import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const JOIN_CODE_HASH_VERSION = 3;
export const UNSALTED_SERVER_JOIN_CODE_HASH_VERSION = 2;
export const LEGACY_JOIN_CODE_HASH_VERSION = 1;
export const JOIN_CODE_SALT_BYTES = 16;

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

export function generateJoinCodeSalt(): string {
  return randomBytes(JOIN_CODE_SALT_BYTES).toString('hex');
}

export function normalizeJoinCodeSalt(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const normalized = value.trim().toLowerCase().slice(0, 64);

  return /^[a-f0-9]{32,64}$/.test(normalized) ? normalized : '';
}

export function buildJoinCodeHash(input: {
  classCode: string;
  joinCode: string;
  joinCodeSalt: string;
}): string {
  const classCode = normalizeJoinClassCode(input.classCode);
  const joinCode = normalizeJoinCode(input.joinCode);
  const joinCodeSalt = normalizeJoinCodeSalt(input.joinCodeSalt);

  if (!classCode || !joinCode || !joinCodeSalt) {
    return '';
  }

  return `server-join-code-v3-${createHash('sha256')
    .update(`${classCode}:${joinCode}:${joinCodeSalt}`, 'utf8')
    .digest('hex')}`;
}

export function buildUnsaltedServerJoinCodeHash(input: {
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
  joinCodeSalt?: unknown;
}): boolean {
  if (typeof input.storedHash !== 'string') {
    return false;
  }

  const expectedHash = buildExpectedJoinCodeHash(input);

  return safeEqualHash(input.storedHash, expectedHash);
}

function buildExpectedJoinCodeHash(input: {
  joinCodeVersion: unknown;
  classCode: string;
  joinCode: string;
  joinCodeSalt?: unknown;
}): string {
  if (input.joinCodeVersion === JOIN_CODE_HASH_VERSION) {
    return buildJoinCodeHash({
      classCode: input.classCode,
      joinCode: input.joinCode,
      joinCodeSalt: typeof input.joinCodeSalt === 'string' ? input.joinCodeSalt : '',
    });
  }

  if (input.joinCodeVersion === UNSALTED_SERVER_JOIN_CODE_HASH_VERSION) {
    return buildUnsaltedServerJoinCodeHash(input);
  }

  return buildLegacyJoinCodeHash(input);
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
