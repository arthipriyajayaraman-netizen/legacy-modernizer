const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const config = require('../server/config');

const hookPath = path.join(config.templatesDir, '.cursor', 'hooks', 'block-off-limits.js');

function runHook(toolInput) {
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(toolInput),
    encoding: 'utf8',
    cwd: config.rootDir,
  });
  return {
    exitCode: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

const writeInput = {
  tool_name: 'Write',
  tool_input: { path: 'src/main/java/com/example/BookingController.java', contents: 'test' },
};

const result = runHook(writeInput);
let parsed = null;
try {
  parsed = JSON.parse(result.stdout);
} catch {
  parsed = { raw: result.stdout };
}

console.log('Hook test — Write to Controller:');
console.log(JSON.stringify(parsed, null, 2));
console.log('Exit code:', result.exitCode);

if (parsed && parsed.permission === 'deny') {
  console.log('PASS: Hook correctly denied off-limits path');
  process.exit(0);
}

console.error('FAIL: Expected deny permission for Controller path');
process.exit(1);
