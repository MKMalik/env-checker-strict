import { execSync } from 'child_process';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  mkdirSync,
  copyFileSync,
} from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ES Module compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Absolute paths
const TEST_DIR = resolve(__dirname, 'tmp');
const MOCKS_DIR = resolve(__dirname, 'mocks');
const CLI = resolve(__dirname, '../bin/env-checker-strict.js');

const pkgJson = {
  name: 'dummy-app',
  version: '1.0.0',
  main: 'mockEntry.js', // or 'main.ts' if testing TypeScript
  type: 'commonjs', // or 'module' if you want to test ESM
};

const TEST_ENTRY = resolve(TEST_DIR, 'index.js');
const PKG_PATH = resolve(TEST_DIR, 'package.json');

// Write dummy package.json
writeFileSync(PKG_PATH, JSON.stringify(pkgJson, null, 2));

// Write dummy entry file
writeFileSync(TEST_ENTRY, `console.log('hello world');`);

function setup({
  isTs = false,
  entry = 'index',         // just name, no extension
  envFile = 'mock.env',    // file to copy as .env
  pkgType = isTs ? 'ts_package.json' : 'package.json',
} = {}) {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true });
  mkdirSync(TEST_DIR, { recursive: true });

  const entryFile = `${entry}.${isTs ? 'ts' : 'js'}`;

  copyFileSync(`${MOCKS_DIR}/${envFile}`, `${TEST_DIR}/.env`);
  copyFileSync(`${MOCKS_DIR}/mockEntry.${isTs ? 'ts' : 'js'}`, `${TEST_DIR}/${entryFile}`);
  copyFileSync(`${MOCKS_DIR}/${pkgType}`, `${TEST_DIR}/package.json`);
}

function read(path) {
  return readFileSync(resolve(TEST_DIR, path), 'utf-8');
}

function test(description, fn) {
  try {
    fn();
    console.log(`✅ ${description}`);
  } catch (e) {
    console.error(`❌ ${description}`);
    console.error(e);
    process.exit(1);
  }
}

function runCLI(args = '') {
  execSync(`node ${CLI} ${args} --show-logs false --show-warns false`, {
    cwd: TEST_DIR,
    stdio: 'inherit',
  });
}


function runTests() {
  test('Default run generates env_checker.js with required variables', () => {
    setup();
    runCLI();
    const content = read('env_checker.js');
    if (!content.includes('JWT_SECRET') || !content.includes('DB_HOST')) {
      throw new Error('Missing env variables in default output');
    }
  });

  // test('--input custom.env reads from correct file', () => {
  //   setup({ envFile: 'custom.env' });
  //   copyFileSync(`${MOCKS_DIR}/mock.env`, `${TEST_DIR}/custom.env`);
  //   runCLI('--input custom.env');
  //   const content = read('env_checker.js');
  //   if (!content.includes('JWT_SECRET')) {
  //     throw new Error('Failed to read from custom.env');
  //   }
  // });

  test('--input missing.env throws error', () => {
    setup();
    try {
      runCLI('--input missing.env');
      throw new Error('Expected failure for missing .env file');
    } catch (e) {
      // pass
    }
  });

  test('--output custom_output.js writes to correct path', () => {
    setup();
    runCLI('--output custom_output.js');
    const content = read('custom_output.js');
    if (!content.includes('JWT_SECRET')) {
      throw new Error('Output file not created at custom path');
    }
  });

  test('--output custom.ts and --ts generates TypeScript output', () => {
    setup({ isTs: true });
    runCLI('--output custom.ts --ts');
    const content = read('custom.ts');
    if (!content.includes('export')) {
      throw new Error('TypeScript output not generated correctly');
    }
  });

  test('--skip DB_HOST skips that key in output', () => {
    setup();
    runCLI('--skip DB_HOST');
    const content = read('env_checker.js');
    if (content.includes('DB_HOST')) {
      throw new Error('DB_HOST should have been skipped');
    }
  });

  test('--skip DB_HOST,JWT_SECRET skips multiple keys', () => {
    setup();
    runCLI('--skip DB_HOST,JWT_SECRET');
    const content = read('env_checker.js');
    if (content.includes('DB_HOST') || content.includes('JWT_SECRET')) {
      throw new Error('Skipped keys still found in output');
    }
  });

  test('--skip fake_key has no effect on real keys', () => {
    setup();
    runCLI('--skip fake_key');
    const content = read('env_checker.js');
    if (!content.includes('JWT_SECRET')) {
      throw new Error('Real keys affected by fake skip');
    }
  });

  test('--comment false does not inject comment in .env', () => {
    setup();
    runCLI('--comment false');
    const content = read('.env');
    if (content.startsWith('\n#')) {
      throw new Error('Comment block should not be present');
    }
  });

  test('--comment true adds comment in .env', () => {
    setup();
    runCLI('--comment true');
    const content = read('.env');
    if (!content.startsWith('\n#')) {
      throw new Error('Expected comment block not found');
    }
  });

  test('--ts alone generates .ts output', () => {
    setup({ isTs: true });
    runCLI('--ts');
    const content = read('env_checker.ts');
    if (!content.includes('export')) {
      throw new Error('TypeScript output not generated');
    }
  });

  test('--inject default injects into main entry from package.json', () => {
    setup({ entry: 'mockEntry' }); // as main: mockEntry.js in package.json
    runCLI('--inject default');
    const content = read('mockEntry.js');
    if (!content.includes('dotenv') || !content.includes('checkEnvAndThrowError')) {
      throw new Error('Injection failed with --inject default');
    }
  });

  test('--ts --inject injects into main entry from package.json', () => {
    setup({ entry: 'mockEntry', isTs: true }); // as main: mockEntry.ts in ts_package.json
    runCLI('--inject default');
    const content = read('mockEntry.ts');
    console.log("content:", content);
    if (!content.includes('dotenv') || !content.includes('checkEnvAndThrowError')) {
      console.log(content);
      throw new Error('Injection failed with --inject default');
    }
  });

  test('--inject index.js injects into given file', () => {
    setup();
    runCLI('--inject index.js');
    const content = read('index.js');
    if (!content.includes('dotenv') || !content.includes('checkEnvAndThrowError')) {
      throw new Error('Injection failed for explicit index.js');
    }
  });

  test('--inject none.js (missing file) throws', () => {
    setup();
    try {
      runCLI('--inject none.js');
      throw new Error('Expected injection failure for nonexistent file');
    } catch (e) {
      // pass
    }
  });

  test('Combination: input + output + skip + ts + comment false + inject', () => {
    setup({ isTs: true });
    runCLI('--input .env --output check.ts --skip DB_HOST --ts --comment false --inject index.ts');
    const ts = read('check.ts');
    const env = read('.env');
    const inject = read('index.ts');

    if (!ts.includes('JWT_SECRET') || ts.includes('DB_HOST')) throw new Error('TS output incorrect');
    if (env.startsWith('\n#')) throw new Error('.env should not have comment');
    if (!inject.includes('checkEnvAndThrowError')) throw new Error('Injection failed');
  });

  test('Combination: ts + inject + skip multiple + comment true', () => {
    setup({ isTs: false });
    runCLI('--ts --inject index.js --skip DB_HOST,JWT_SECRET --comment true');
    const ts = read('env_checker.ts');
    const env = read('.env');
    const inject = read('index.js');

    if (ts.includes('DB_HOST') || ts.includes('JWT_SECRET')) throw new Error('Skipped keys not removed');
    if (!env.startsWith('\n#')) throw new Error('.env missing comment');
    if (!inject.includes('checkEnvAndThrowError')) throw new Error('Missing injection');
  });

  test('Edge: missing .env throws error', () => {
    if (existsSync(`${TEST_DIR}/.env`)) rmSync(`${TEST_DIR}/.env`);
    try {
      runCLI();
      throw new Error('Expected to throw on missing .env');
    } catch (e) {
      // pass
    }
  });

  test('Edge: empty .env handles gracefully', () => {
    writeFileSync(`${TEST_DIR}/.env`, '');
    runCLI();
    const js = read('env_checker.js');
    const match = js.match(/const\s+ENV_LIST\s*=\s*\[([\s\S]*?)\]/);
    const contentInside = match[1]
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('//')); // Ignore comments and empty lines
    if (contentInside.length !== 0) throw new Error('Output should be empty for empty .env');
  });

  test('Edge: invalid .env lines are ignored', () => {
    writeFileSync(`${TEST_DIR}/.env`, '=invalid\nANOTHER=value');
    runCLI();
    const js = read('env_checker.js');
    if (js.includes('invalid')) throw new Error('Invalid line should be ignored');
    if (!js.includes('ANOTHER')) throw new Error('Valid key should remain');
  });

  test('Edge: inject into TS file with "type: module"', () => {
    const newPkg = {
      name: 'dummy-app',
      version: '1.0.0',
      main: 'main.ts',
      type: 'module',
    };
    writeFileSync(PKG_PATH, JSON.stringify(newPkg, null, 2));
    copyFileSync(`${MOCKS_DIR}/mockEntry.js`, `${TEST_DIR}/main.ts`);
    runCLI('--inject default');
    const content = read('main.ts');
    if (!content.includes('checkEnvAndThrowError')) {
      throw new Error('Injection failed into TS module file');
    }
  });

  console.log('\n🎉 All tests passed!');
}

runTests();

