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

  return `client-join-code-v1-${fnv1a(`${classCode}:${joinCode}`)}`;
}

export const CLIENT_JOIN_CODE_HASH_VERSION = 1;

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}
