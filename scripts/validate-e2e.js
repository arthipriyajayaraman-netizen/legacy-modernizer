const base = process.env.BASE_URL || 'http://localhost:3000';

async function pollReady(sessionId, maxAttempts = 90) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${base}/api/sessions/${sessionId}/status`);
    const data = await res.json();
    if (data.status === 'ready' || data.status === 'error') return data;
    process.stdout.write('.');
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Scan timed out');
}

async function main() {
  console.log('Creating session...');
  const createRes = await fetch(`${base}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      repoUrl: 'https://github.com/CMOD-Lab/ResortsLite_ma.git',
      branch: 'main',
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.json();
    throw new Error(err.error || 'Failed to create session');
  }

  const { sessionId } = await createRes.json();
  console.log('Session:', sessionId);

  const status = await pollReady(sessionId);
  console.log('\nStatus:', status.status);

  if (status.status === 'error') {
    throw new Error(status.error || 'Session failed');
  }

  const assessmentRes = await fetch(`${base}/api/sessions/${sessionId}/assessment`);
  const assessment = await assessmentRes.json();

  console.log('Repo:', assessment.repo.name);
  console.log('Java:', assessment.stack.javaVersion);
  console.log('Spring Boot:', assessment.stack.springBootVersion);
  console.log('Components:', assessment.componentCount);
  console.log('Safety seeded:', assessment.safetySeeded);
  console.log('Characterization:', assessment.characterizationStatus);

  if (!assessment.safetySeeded) throw new Error('Safety files not seeded');
  if (assessment.characterizationStatus !== 'not_started') {
    throw new Error('Expected characterizationStatus not_started');
  }
  if (assessment.componentCount < 1) throw new Error('Expected at least 1 component');

  const cpRes = await fetch(`${base}/api/sessions/${sessionId}/checkpoint`, { method: 'POST' });
  const cp = await cpRes.json();
  console.log('Checkpoint:', cp.tag);

  const ids = assessment.components.slice(0, 2).map((c) => c.id);
  const modRes = await fetch(`${base}/api/sessions/${sessionId}/modernize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ componentIds: ids }),
  });
  const mod = await modRes.json();
  console.log('Mock modernize files:', mod.summary.files);

  console.log('\nAll validations passed.');
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});
