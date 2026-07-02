#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REQUIRED_FIELDS = ['project_id', 'client_email', 'private_key'];
const DEFAULT_OUTPUT_PATH = path.join(
  process.cwd(),
  '.secrets',
  'FIREBASE_SERVICE_ACCOUNT_BASE64.txt',
);

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    return;
  }

  if (args.includes('--self-test')) {
    runSelfTest();
    console.log('Self-test passed.');
    return;
  }

  const inputPath = args.find((arg) => !arg.startsWith('--'));
  const outputPath = readOption(args, '--out') ?? DEFAULT_OUTPUT_PATH;
  const printValue = args.includes('--print');

  if (!inputPath) {
    printHelp();
    process.exitCode = 1;
    return;
  }

  const absoluteInputPath = path.resolve(inputPath);
  const absoluteOutputPath = path.resolve(outputPath);
  const serviceAccount = await readServiceAccount(absoluteInputPath);
  const encoded = encodeServiceAccount(serviceAccount);

  if (printValue) {
    console.log(encoded);
    return;
  }

  await mkdir(path.dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, `${encoded}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  console.log(`Wrote FIREBASE_SERVICE_ACCOUNT_BASE64 to ${absoluteOutputPath}`);
  console.log('This file contains a secret. Do not commit it.');
}

async function readServiceAccount(filePath) {
  const raw = await readFile(filePath, 'utf8');
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`Service account file is not valid JSON: ${error.message}`);
  }

  validateServiceAccount(parsed);

  return pickServiceAccountFields(parsed);
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

  if (value.private_key.length < 100 || !value.private_key.includes('\n')) {
    throw new Error('Service account key material does not look complete.');
  }
}

function pickServiceAccountFields(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, itemValue]) => itemValue !== undefined),
  );
}

function encodeServiceAccount(value) {
  validateServiceAccount(value);

  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

function readOption(args, optionName) {
  const optionIndex = args.indexOf(optionName);

  if (optionIndex === -1) {
    return undefined;
  }

  return args[optionIndex + 1];
}

function runSelfTest() {
  const encoded = encodeServiceAccount({
    project_id: 'demo-project',
    client_email: 'firebase-adminsdk-demo@demo-project.iam.gserviceaccount.com',
    private_key:
      '-----BEGIN DEMO KEY-----\n0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz\n-----END DEMO KEY-----\n',
  });
  const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));

  if (decoded.project_id !== 'demo-project') {
    throw new Error('Self-test failed: project_id mismatch.');
  }
}

function printHelp() {
  console.log(`Usage:
  npm run firebase:admin-env -- <path-to-service-account.json>
  npm run firebase:admin-env -- <path-to-service-account.json> --out .secrets/FIREBASE_SERVICE_ACCOUNT_BASE64.txt
  npm run firebase:admin-env -- --self-test

Default output:
  ${DEFAULT_OUTPUT_PATH}

Notes:
  - The output value is a server-only Vercel environment variable.
  - Use the variable name FIREBASE_SERVICE_ACCOUNT_BASE64.
  - Do not prefix it with VITE_.
  - Do not commit service account JSON files or files under .secrets/.
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
