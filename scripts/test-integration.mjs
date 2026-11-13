import { spawnSync } from 'node:child_process';

// Never consult .firebaserc, dotenv, a user's active project, or credentials.
const project = 'demo-jinrou-integration';
const env = { ...process.env, GCLOUD_PROJECT: project, GOOGLE_CLOUD_PROJECT: project,
  FIREBASE_AUTH_EMULATOR_HOST: '127.0.0.1:9099',
  FIREBASE_DATABASE_EMULATOR_HOST: '127.0.0.1:9000',
  FIREBASE_CLI_DISABLE_UPDATE_CHECK: 'true', CI: 'true' };
for (const key of ['GOOGLE_APPLICATION_CREDENTIALS', 'FIREBASE_TOKEN', 'FIREBASE_CONFIG', 'CLOUDSDK_AUTH_CREDENTIAL_FILE_OVERRIDE']) delete env[key];
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(args) {
  const result = spawnSync(npm, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
run(['run', 'build', '--prefix', 'functions']);
run(['exec', '--yes', '--package=firebase-tools@14.12.0', '--', 'firebase',
  'emulators:exec', '--config', 'firebase.emulator.json', '--project', project,
  '--only', 'auth,database,functions', 'node --test --test-concurrency=1 tests/integration/game.test.mjs']);
