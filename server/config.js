const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT_DIR = path.join(__dirname, '..');

module.exports = {
  port: parseInt(process.env.PORT || '3000', 10),
  sandboxDir: process.env.SANDBOX_DIR || path.join(require('os').tmpdir(), 'legacy-modernizer'),
  githubToken: process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '',
  cursorApiKey: process.env.CURSOR_API_KEY || '',
  defaultRepoUrl: process.env.DEFAULT_REPO_URL || 'https://github.com/CMOD-Lab/ResortsLite_ma.git',
  defaultBranch: process.env.DEFAULT_BRANCH || 'main',
  rootDir: ROOT_DIR,
  rulesDir: path.join(ROOT_DIR, 'rules'),
  dataDir: path.join(ROOT_DIR, 'data'),
  templatesDir: path.join(ROOT_DIR, 'templates', 'sandbox'),
};
