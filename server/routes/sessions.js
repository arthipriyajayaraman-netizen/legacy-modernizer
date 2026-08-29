const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const sessionStore = require('../store/sessionStore');
const { cloneRepo } = require('../sandbox/cloneRepo');
const { scanMavenRepo } = require('../scanner/mavenScanner');
const { buildAssessment } = require('../scanner/assessmentBuilder');
const { createCheckpoint, rewind, listCheckpoints } = require('../sandbox/checkpoint');

const router = express.Router();
const mockFileChanges = JSON.parse(
  fs.readFileSync(path.join(config.dataDir, 'mock-file-changes.json'), 'utf8')
);

router.post('/', async (req, res) => {
  const repoUrl = req.body.repoUrl || config.defaultRepoUrl;
  const branch = req.body.branch || config.defaultBranch;
  const sessionId = uuidv4();

  const session = {
    id: sessionId,
    status: 'cloning',
    repoUrl,
    branch,
    clonePath: null,
    assessment: null,
    error: null,
    checkpointIndex: 0,
    createdAt: Date.now(),
  };

  sessionStore.create(session);

  processSession(sessionId, repoUrl, branch).catch((err) => {
    sessionStore.update(sessionId, { status: 'error', error: err.message });
  });

  res.status(201).json({ sessionId, status: 'cloning' });
});

async function processSession(sessionId, repoUrl, branch) {
  sessionStore.update(sessionId, { status: 'cloning' });

  const repoInfo = await cloneRepo(sessionId, repoUrl, branch);
  sessionStore.update(sessionId, { status: 'scanning', clonePath: repoInfo.clonePath });

  const scanResult = scanMavenRepo(repoInfo.clonePath);
  const assessment = buildAssessment(repoInfo, scanResult, repoInfo.safetySeeded);

  sessionStore.update(sessionId, {
    status: 'ready',
    assessment,
    owner: repoInfo.owner,
    name: repoInfo.name,
    clonePath: repoInfo.clonePath,
  });
}

router.get('/:id/status', (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  res.json({
    status: session.status,
    error: session.error || null,
  });
});

router.get('/:id/assessment', (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!session.assessment) {
    return res.status(202).json({ status: session.status, message: 'Assessment not ready' });
  }

  res.json(session.assessment);
});

router.post('/:id/checkpoint', async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!session.clonePath) return res.status(400).json({ error: 'No clone available' });

  try {
    const nextIndex = (session.checkpointIndex || 0) + 1;
    const result = await createCheckpoint(session.clonePath, session.id, nextIndex);
    sessionStore.update(session.id, { checkpointIndex: nextIndex, lastCheckpoint: result.tag });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/rewind', async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!session.clonePath) return res.status(400).json({ error: 'No clone available' });

  const checkpointTag = req.body.checkpointTag || session.lastCheckpoint;
  if (!checkpointTag) return res.status(400).json({ error: 'checkpointTag required' });

  try {
    const result = await rewind(session.clonePath, checkpointTag);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/checkpoints', async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!session.clonePath) return res.status(400).json({ error: 'No clone available' });

  try {
    const tags = await listCheckpoints(session.clonePath, session.id);
    res.json({ checkpoints: tags });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/modernize', async (req, res) => {
  const session = sessionStore.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  if (!session.assessment) return res.status(400).json({ error: 'Assessment not ready' });

  const componentIds = req.body.componentIds || [];
  if (componentIds.length === 0) {
    return res.status(400).json({ error: 'componentIds required' });
  }

  let fileChanges = [];
  for (const id of componentIds) {
    const changes = mockFileChanges[id] || [];
    fileChanges = fileChanges.concat(changes);
  }

  const totalAdd = fileChanges.reduce((s, f) => s + f.add, 0);
  const totalRem = fileChanges.reduce((s, f) => s + f.rem, 0);

  const selectedComponents = session.assessment.components.filter((c) =>
    componentIds.includes(c.id)
  );
  const suggestedNames = selectedComponents.map((c) => c.suggested);
  const shortList = suggestedNames.slice(0, 3).join(', ') +
    (suggestedNames.length > 3 ? ', …' : '');

  sessionStore.update(session.id, {
    lastModernize: {
      componentIds,
      fileChanges,
      totalAdd,
      totalRem,
      commitMessage: `Modernize: ${shortList}\n\nApplied via Legacy Modernizer agent — ${componentIds.length} component(s) updated.`,
    },
  });

  res.json({
    mock: true,
    componentIds,
    fileChanges,
    summary: {
      components: componentIds.length,
      files: fileChanges.length,
      linesAdded: totalAdd,
      linesRemoved: totalRem,
    },
    commitMessage: `Modernize: ${shortList}\n\nApplied via Legacy Modernizer agent — ${componentIds.length} component(s) updated.`,
  });
});

module.exports = router;
