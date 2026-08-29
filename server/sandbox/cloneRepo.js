const fs = require('fs');
const path = require('path');
const simpleGit = require('simple-git');
const config = require('../config');
const { seedSafetyFiles } = require('./seedSafetyFiles');

function parseGitHubUrl(repoUrl) {
  const patterns = [
    /github\.com[:/]([^/]+)\/([^/.]+?)(?:\.git)?$/,
    /github\.com\/([^/]+)\/([^/]+)/,
  ];
  for (const pattern of patterns) {
    const match = repoUrl.match(pattern);
    if (match) {
      return { owner: match[1], name: match[2].replace(/\.git$/, '') };
    }
  }
  return null;
}

async function ensureSandboxDir() {
  if (!fs.existsSync(config.sandboxDir)) {
    fs.mkdirSync(config.sandboxDir, { recursive: true });
  }
}

async function cloneRepo(sessionId, repoUrl, branch) {
  await ensureSandboxDir();
  const clonePath = path.join(config.sandboxDir, sessionId);
  const parsed = parseGitHubUrl(repoUrl);

  if (!parsed) {
    throw new Error('Invalid GitHub repository URL. Use https://github.com/owner/repo.git');
  }

  if (fs.existsSync(clonePath)) {
    fs.rmSync(clonePath, { recursive: true, force: true });
  }

  const git = simpleGit();
  await git.clone(repoUrl, clonePath, ['--depth', '1', '--branch', branch]);

  const repoGit = simpleGit(clonePath);
  const seedResult = seedSafetyFiles(clonePath);

  try {
    await repoGit.addConfig('user.email', 'legacy-modernizer@local');
    await repoGit.addConfig('user.name', 'Legacy Modernizer');
    await repoGit.add('-A');
    const status = await repoGit.status();
    if (status.staged.length > 0 || status.not_added.length > 0 || status.modified.length > 0) {
      await repoGit.commit('lm-initial: safety files seeded');
    } else {
      await repoGit.commit('lm-initial: safety files seeded', undefined, { '--allow-empty': null });
    }
  } catch {
    // Clone may already include commits; checkpoint tags still work on HEAD
  }

  return {
    clonePath,
    owner: parsed.owner,
    name: parsed.name,
    branch,
    url: repoUrl,
    safetySeeded: seedResult.seeded,
  };
}

module.exports = { cloneRepo, parseGitHubUrl };
