const fs = require('fs');
const path = require('path');
const { minimatch } = require('minimatch');
const config = require('../server/config');

function loadOffLimitsPaths() {
  const rulesPath = path.join(config.rulesDir, 'off-limits-paths.json');
  const data = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
  return data.paths || [];
}

function isOffLimits(filePath, patterns = null) {
  const pats = patterns || loadOffLimitsPaths();
  const normalized = filePath.replace(/\\/g, '/');
  return pats.some((pattern) => minimatch(normalized, pattern, { dot: true }));
}

if (require.main === module) {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: npm run guard -- <file-path>');
    process.exit(2);
  }
  if (isOffLimits(target)) {
    console.error(`Blocked: ${target} is off-limits during modernization`);
    process.exit(1);
  }
  console.log(`Allowed: ${target}`);
  process.exit(0);
}

module.exports = { isOffLimits, loadOffLimitsPaths };
