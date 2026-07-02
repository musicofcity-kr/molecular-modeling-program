#!/usr/bin/env node

import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const REQUIRED_FIELDS = ['project_id', 'client_email', 'private_key'];
const DEFAULT_BASE64_PATH = path.join(
  process.cwd(),
  '.secrets',
  'FIREBASE_SERVICE_ACCOUNT_BASE64.txt',
);

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.selfTest) {
    runSelfTest();
    console.log('Self-test passed.');
    return;
  }

  const serviceAccount = await loadServiceAccount(args);
  const app = getApps()[0] ?? initializeFirebaseAdmin(serviceAccount);
  const auth = getAuth(app);
  const user = args.email
    ? await auth.getUserByEmail(args.email)
    : await auth.getUser(args.uid);
  const nextClaims = buildTeacherClaims(user.customClaims ?? {}, args.revoke);
  const claimsForFirebase = Object.keys(nextClaims).length > 0 ? nextClaims : null;

  await auth.setCustomUserClaims(user.uid, claimsForFirebase);

  console.log(
    `${args.revoke ? 'Revoked' : 'Granted'} teacher access for uid=${user.uid}${
      user.email ? ` email=${user.email}` : ''
    }`,
  );
  console.log(formatClaimSummary(nextClaims));
  console.log('The teacher must sign out and sign in again to receive a refreshed ID token.');
}

function parseArgs(argv) {
  const help = argv.includes('--help') || argv.includes('-h');
  const selfTest = argv.includes('--self-test');
  const email = readOption(argv, '--email');
  const uid = readOption(argv, '--uid');
  const serviceAccountPath = readOption(argv, '--service-account');
  const revoke = argv.includes('--revoke');

  if (help || selfTest) {
    return { help, selfTest, email, uid, serviceAccountPath, revoke };
  }

  if (!email && !uid) {
    throw new Error('Provide exactly one target with --email or --uid.');
  }

  if (email && uid) {
    throw new Error('Use only one target: --email or --uid.');
  }

  return { help, selfTest, email, uid, serviceAccountPath, revoke };
}

function readOption(argv, optionName) {
  const optionIndex = argv.indexOf(optionName);

  if (optionIndex === -1) {
    return undefined;
  }

  const value = argv[optionIndex + 1];

  if (!value || value.startsWith('--')) {
    throw new Error(`${optionName} requires a value.`);
  }

  return value;
}

async function loadServiceAccount(args) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    return parseBase64ServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64);
  }

  if (args.serviceAccountPath) {
    const raw = await readFile(path.resolve(args.serviceAccountPath), 'utf8');
    return parseServiceAccountJson(raw);
  }

  if (await fileExists(DEFAULT_BASE64_PATH)) {
    const encoded = await readFile(DEFAULT_BASE64_PATH, 'utf8');
    return parseBase64ServiceAccount(encoded);
  }

  throw new Error(
    [
      'Firebase Admin credentials were not found.',
      'Set FIREBASE_SERVICE_ACCOUNT_BASE64, run firebase:admin-env first,',
      'or pass --service-account .secrets/firebase-service-account.json.',
    ].join(' '),
  );
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseBase64ServiceAccount(encoded) {
  const trimmed = encoded.trim();

  if (!trimmed) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is empty.');
  }

  let raw;

  try {
    raw = Buffer.from(trimmed, 'base64').toString('utf8');
  } catch (error) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_BASE64 could not be decoded: ${error.message}`);
  }

  return parseServiceAccountJson(raw);
}

function parseServiceAccountJson(raw) {
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Service account value is not valid JSON: ${error.message}`);
  }

  validateServiceAccount(parsed);

  return parsed;
}

function validateServiceAccount(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Service account JSON must be an object.');
  }

  const missingFields = REQUIRED_FIELDS.filter(
    (field) => typeof value[field] !== 'string' || value[field].trim() === '',
  );

  if (missingFields.length > 0) {
    throw new Error(`Service account JSON is missing: ${missingFields.join(', ')}`);
  }
}

function initializeFirebaseAdmin(serviceAccount) {
  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
    projectId: serviceAccount.project_id,
  });
}

function buildTeacherClaims(currentClaims, revoke) {
  const nextClaims = { ...currentClaims };

  if (revoke) {
    delete nextClaims.teacher;

    if (nextClaims.role === 'teacher') {
      delete nextClaims.role;
    }

    return nextClaims;
  }

  nextClaims.teacher = true;
  nextClaims.role = 'teacher';

  return nextClaims;
}

function formatClaimSummary(claims) {
  const claimKeys = Object.keys(claims).sort();
  const teacherValue = claims.teacher === true ? 'true' : 'false';
  const roleValue = typeof claims.role === 'string' ? claims.role : 'unset';

  return `teacher=${teacherValue}, role=${roleValue}, claimKeys=${
    claimKeys.length > 0 ? claimKeys.join(',') : 'none'
  }`;
}

function runSelfTest() {
  const grant = buildTeacherClaims({ existing: true }, false);

  if (grant.teacher !== true || grant.role !== 'teacher' || grant.existing !== true) {
    throw new Error('Grant claim merge failed.');
  }

  const revoke = buildTeacherClaims({ teacher: true, role: 'teacher', existing: true }, true);

  if (revoke.teacher !== undefined || revoke.role !== undefined || revoke.existing !== true) {
    throw new Error('Revoke claim cleanup failed.');
  }

  const preserveRole = buildTeacherClaims({ teacher: true, role: 'admin' }, true);

  if (preserveRole.role !== 'admin') {
    throw new Error('Revoke must preserve non-teacher roles.');
  }

  const parsedEmail = parseArgs(['--email', 'teacher@example.com']);

  if (parsedEmail.email !== 'teacher@example.com' || parsedEmail.uid !== undefined) {
    throw new Error('Email argument parsing failed.');
  }

  const parsedUid = parseArgs(['--uid', 'abc123', '--revoke']);

  if (parsedUid.uid !== 'abc123' || parsedUid.revoke !== true) {
    throw new Error('UID argument parsing failed.');
  }

  assertThrows(() => parseArgs([]), 'missing target');
  assertThrows(() => parseArgs(['--email', 'a@example.com', '--uid', 'abc123']), 'multiple targets');
  assertThrows(() => readOption(['--email'], '--email'), 'missing option value');

  const encoded = Buffer.from(
    JSON.stringify({
      project_id: 'demo-project',
      client_email: 'firebase-adminsdk-demo@demo-project.iam.gserviceaccount.com',
      private_key: '-----BEGIN DEMO KEY-----\\nabc\\n-----END DEMO KEY-----\\n',
    }),
    'utf8',
  ).toString('base64');
  const decoded = parseBase64ServiceAccount(encoded);

  if (decoded.project_id !== 'demo-project') {
    throw new Error('Base64 service account parsing failed.');
  }
}

function assertThrows(action, label) {
  try {
    action();
  } catch {
    return;
  }

  throw new Error(`Expected ${label} to throw.`);
}

function printHelp() {
  console.log(`Usage:
  npm run firebase:teacher-claim -- --email teacher@example.com
  npm run firebase:teacher-claim -- --uid <firebase-auth-uid>
  npm run firebase:teacher-claim -- --email teacher@example.com --revoke
  npm run firebase:teacher-claim -- --self-test

Credential sources, in order:
  1. FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable
  2. --service-account <path-to-service-account.json>
  3. ${DEFAULT_BASE64_PATH}

Notes:
  - This script never prints service account values.
  - The teacher must sign out and sign in again after claims change.
  - Do not grant teacher claims to student accounts.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
