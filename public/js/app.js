const state = {
  sessionId: null,
  assessment: null,
  selected: new Set(),
  components: [],
};

const els = {
  repoUrl: document.getElementById('repoUrl'),
  branch: document.getElementById('branch'),
  scanBtn: document.getElementById('scanBtn'),
  scanStatus: document.getElementById('scanStatus'),
  scanStatusText: document.getElementById('scanStatusText'),
  scanError: document.getElementById('scanError'),
  connectCard: document.getElementById('connectCard'),
  assessmentPanel: document.getElementById('assessmentPanel'),
  safetyRow: document.getElementById('safetyRow'),
  stackGrid: document.getElementById('stackGrid'),
  structureStats: document.getElementById('structureStats'),
  riskList: document.getElementById('riskList'),
  orderList: document.getElementById('orderList'),
  continueBtn: document.getElementById('continueBtn'),
  repoChip: document.getElementById('repoChip'),
  componentCountChip: document.getElementById('componentCountChip'),
  step2Desc: document.getElementById('step2Desc'),
  assetRows: document.getElementById('assetRows'),
  selCount: document.getElementById('selCount'),
  totalCount: document.getElementById('totalCount'),
  modernizeBtn: document.getElementById('modernizeBtn'),
  changesPanel: document.getElementById('changesPanel'),
  fileDiffList: document.getElementById('fileDiffList'),
  publishRepoUrl: document.getElementById('publishRepoUrl'),
  commitMsg: document.getElementById('commitMsg'),
  baseBranch: document.getElementById('baseBranch'),
  sumComponents: document.getElementById('sumComponents'),
  sumFiles: document.getElementById('sumFiles'),
  sumAdd: document.getElementById('sumAdd'),
  sumRem: document.getElementById('sumRem'),
  sumBranch: document.getElementById('sumBranch'),
  publishForm: document.getElementById('publishForm'),
  successState: document.getElementById('successState'),
  prToggle: document.getElementById('prToggle'),
  prLink: document.getElementById('prLink'),
  successBranchText: document.getElementById('successBranchText'),
  prStatusText: document.getElementById('prStatusText'),
};

async function loadConfig() {
  const res = await fetch('/api/config');
  const cfg = await res.json();
  if (!els.repoUrl.value) els.repoUrl.value = cfg.defaultRepoUrl;
  if (!els.branch.value) els.branch.value = cfg.defaultBranch;
}

function goToStep(n) {
  for (let i = 1; i <= 3; i++) {
    document.getElementById('screen-' + i).classList.toggle('active', i === n);
    const nav = document.getElementById('stepnav-' + i);
    nav.classList.toggle('active', i === n);
    nav.classList.toggle('done', i < n);
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-step]').forEach((el) => {
  el.addEventListener('click', () => {
    const step = parseInt(el.dataset.step, 10);
    if (step === 2 && !state.assessment) return;
    if (step === 3 && !state.lastModernize) return;
    goToStep(step);
  });
});

function showScanStatus(text, active = true, isError = false) {
  els.scanStatus.style.display = 'flex';
  els.scanStatusText.textContent = text;
  els.scanStatus.classList.toggle('active', active && !isError);
  els.scanStatus.classList.toggle('error', isError);
  els.scanError.style.display = 'none';
}

function showScanError(msg) {
  els.scanStatus.style.display = 'none';
  els.scanError.style.display = 'block';
  els.scanError.textContent = msg;
  els.scanBtn.disabled = false;
}

function renderAssessment(assessment) {
  state.assessment = assessment;
  state.components = assessment.components || [];

  els.safetyRow.innerHTML = `
    <span class="status-badge ${assessment.safetySeeded ? 'ok' : 'pending'}">
      ${assessment.safetySeeded ? 'Rules & hooks seeded' : 'Safety files pending'}
    </span>
    <span class="status-badge pending">Characterization tests: ${assessment.characterizationStatus}</span>
  `;

  els.stackGrid.innerHTML = `
    <div class="stack-card"><div class="label">Java</div><div class="value">${assessment.stack.javaVersion}</div></div>
    <div class="stack-card"><div class="label">Spring Boot</div><div class="value">${assessment.stack.springBootVersion}</div></div>
    <div class="stack-card"><div class="label">Tests</div><div class="value">${assessment.stack.testFramework}</div></div>
    <div class="stack-card"><div class="label">Logging</div><div class="value">${assessment.stack.logging}</div></div>
  `;

  const s = assessment.structure;
  els.structureStats.textContent =
    `${s.pomFiles} pom.xml · ${s.javaSourceFiles} source files · ${s.testFiles} test files · CI: ${s.hasCi ? 'yes' : 'no'}${s.multiModule ? ' · multi-module' : ''}`;

  els.riskList.innerHTML = (assessment.risks || []).map((r) =>
    `<li><span class="impact ${r.level}">${r.level}</span> ${r.message}</li>`
  ).join('') || '<li>No critical risks detected.</li>';

  els.orderList.innerHTML = (assessment.recommendedOrder || []).map((id) => {
    const comp = state.components.find((c) => c.id === id);
    return `<li>${comp ? comp.name : id}</li>`;
  }).join('');

  els.connectCard.classList.add('hidden');
  els.assessmentPanel.classList.add('show');
  els.scanStatus.style.display = 'none';
  els.scanBtn.disabled = false;
}

function renderRows() {
  const total = state.components.length;
  els.totalCount.textContent = total;
  els.componentCountChip.textContent = `${total} components scanned`;

  if (state.assessment?.repo) {
    els.repoChip.innerHTML = `📦 <b>${state.assessment.repo.name}</b> · ${state.assessment.repo.branch}`;
    els.step2Desc.textContent =
      `The agent found ${total} component${total === 1 ? '' : 's'} running outdated technology. Select rows to modernize.`;
    els.publishRepoUrl.value = state.assessment.repo.url;
    els.baseBranch.value = state.assessment.repo.branch;
    els.sumBranch.textContent = state.assessment.repo.branch;
  }

  els.assetRows.innerHTML = state.components.map((a) => `
    <tr id="row-${a.id}" class="${state.selected.has(a.id) ? 'selected' : ''}">
      <td>
        <div class="checkbox ${state.selected.has(a.id) ? 'checked' : ''}" data-id="${a.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>
        </div>
      </td>
      <td>
        <div class="comp-name">${a.name}</div>
        <div class="comp-path">${a.path}</div>
      </td>
      <td><span class="pill legacy">${a.current}</span></td>
      <td><span class="transform-arrow">→</span></td>
      <td><span class="pill modern">${a.suggested}</span></td>
      <td><span class="impact ${a.impact}">${a.impact}</span></td>
    </tr>
  `).join('');

  els.assetRows.querySelectorAll('.checkbox').forEach((chk) => {
    chk.addEventListener('click', () => toggleRow(chk.dataset.id));
  });

  updateSelectionUI();
}

function autoSelectPrerequisites(id) {
  const comp = state.components.find((c) => c.id === id);
  if (!comp?.requires) return;
  comp.requires.forEach((reqId) => {
    state.selected.add(reqId);
    autoSelectPrerequisites(reqId);
  });
}

function toggleRow(id) {
  if (state.selected.has(id)) {
    state.selected.delete(id);
  } else {
    state.selected.add(id);
    autoSelectPrerequisites(id);
  }
  renderRows();
}

function updateSelectionUI() {
  els.selCount.textContent = state.selected.size;
  els.modernizeBtn.disabled = state.selected.size === 0;
}

async function pollSession(sessionId) {
  const maxAttempts = 120;
  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await fetch(`/api/sessions/${sessionId}/status`);
    const statusData = await statusRes.json();

    if (statusData.status === 'ready') {
      const assessRes = await fetch(`/api/sessions/${sessionId}/assessment`);
      const assessment = await assessRes.json();
      renderAssessment(assessment);
      renderRows();
      return;
    }

    if (statusData.status === 'error') {
      showScanError(statusData.error || 'Scan failed');
      return;
    }

    const labels = {
      cloning: 'Cloning repository…',
      scanning: 'Analyzing Maven manifests and source structure…',
    };
    showScanStatus(labels[statusData.status] || 'Processing…');
    await new Promise((r) => setTimeout(r, 1500));
  }

  showScanError('Scan timed out. Check network and try again.');
}

els.scanBtn.addEventListener('click', async () => {
  els.scanBtn.disabled = true;
  els.scanError.style.display = 'none';
  state.selected.clear();
  state.lastModernize = null;
  els.changesPanel.classList.remove('show');
  els.assessmentPanel.classList.remove('show');
  els.connectCard.classList.remove('hidden');

  showScanStatus('Creating session and cloning repository…');

  try {
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoUrl: els.repoUrl.value.trim(),
        branch: els.branch.value.trim() || 'main',
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      showScanError(err.error || 'Failed to start scan');
      return;
    }

    const data = await res.json();
    state.sessionId = data.sessionId;
    await pollSession(data.sessionId);
  } catch (err) {
    showScanError(err.message || 'Network error');
  }
});

els.continueBtn.addEventListener('click', () => goToStep(2));
document.getElementById('backBtn').addEventListener('click', () => goToStep(1));
document.getElementById('continuePublishBtn').addEventListener('click', () => goToStep(3));

els.modernizeBtn.addEventListener('click', async () => {
  if (!state.sessionId || state.selected.size === 0) return;
  els.modernizeBtn.disabled = true;

  try {
    const res = await fetch(`/api/sessions/${state.sessionId}/modernize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ componentIds: Array.from(state.selected) }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Modernize failed');
      els.modernizeBtn.disabled = false;
      return;
    }

    state.lastModernize = data;

    els.fileDiffList.innerHTML = (data.fileChanges || []).map((fc) => `
      <div class="file-diff">
        <span class="fname">${fc.f}</span>
        <span class="diff-stats"><span class="add">+${fc.add}</span><span class="rem">−${fc.rem}</span></span>
      </div>
    `).join('');

    els.changesPanel.classList.add('show');

    els.sumComponents.textContent = data.summary.components;
    els.sumFiles.textContent = data.summary.files;
    els.sumAdd.textContent = '+' + data.summary.linesAdded;
    els.sumRem.textContent = '−' + data.summary.linesRemoved;
    els.commitMsg.value = data.commitMessage;

    const shortList = state.components
      .filter((c) => state.selected.has(c.id))
      .map((c) => c.suggested)
      .slice(0, 3)
      .join(', ');
    els.prLink.textContent = `🔗 #482 — Modernize: ${shortList}`;
  } catch (err) {
    alert(err.message);
    els.modernizeBtn.disabled = false;
  }
});

els.prToggle.addEventListener('click', () => els.prToggle.classList.toggle('on'));

document.getElementById('pushBtn').addEventListener('click', () => {
  console.info('Phase 3: GitHub MCP publish not wired yet');
  els.publishForm.classList.add('hidden');

  const repo = state.assessment?.repo;
  const branch = document.getElementById('newBranch').value;
  const prOn = els.prToggle.classList.contains('on');

  els.successBranchText.innerHTML =
    `Branch <b style="font-family:var(--font-mono); color:var(--text);">${branch}</b> was pushed to <b style="font-family:var(--font-mono); color:var(--text);">${repo?.owner}/${repo?.name}</b>.`;

  els.prStatusText.textContent = prOn
    ? 'A pull request was opened against ' + els.baseBranch.value + '.'
    : 'Pushed directly — no pull request was opened.';
  els.prLink.style.display = prOn ? 'inline-block' : 'none';
  els.successState.classList.add('show');
});

document.getElementById('resetBtn').addEventListener('click', () => {
  state.sessionId = null;
  state.assessment = null;
  state.components = [];
  state.selected.clear();
  state.lastModernize = null;

  els.connectCard.classList.remove('hidden');
  els.assessmentPanel.classList.remove('show');
  els.changesPanel.classList.remove('show');
  els.publishForm.classList.remove('hidden');
  els.successState.classList.remove('show');
  els.scanError.style.display = 'none';
  els.scanStatus.style.display = 'none';
  els.scanBtn.disabled = false;
  els.assetRows.innerHTML = '';
  goToStep(1);
});

loadConfig();
