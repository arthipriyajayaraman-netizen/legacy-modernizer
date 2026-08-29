const simpleGit = require('simple-git');

async function createCheckpoint(clonePath, sessionId, checkpointIndex) {
  const git = simpleGit(clonePath);
  const tag = `lm-checkpoint-${sessionId}-${checkpointIndex}`;
  const message = `lm-checkpoint:${sessionId}:${checkpointIndex}`;

  await git.add('-A');
  try {
    await git.commit(message, undefined, { '--allow-empty': null });
  } catch {
  }

  try {
    await git.addTag(tag);
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      await git.raw(['tag', '-f', tag]);
    } else {
      throw err;
    }
  }

  return { tag, index: checkpointIndex };
}

async function rewind(clonePath, checkpointTag) {
  const git = simpleGit(clonePath);
  await git.reset(['--hard', checkpointTag]);
  await git.clean('f', ['-d']);
  return { rewoundTo: checkpointTag };
}

async function listCheckpoints(clonePath, sessionId) {
  const git = simpleGit(clonePath);
  const tags = await git.tags();
  const prefix = `lm-checkpoint-${sessionId}-`;
  return (tags.all || [])
    .filter((t) => t.startsWith(prefix))
    .sort();
}

module.exports = { createCheckpoint, rewind, listCheckpoints };
