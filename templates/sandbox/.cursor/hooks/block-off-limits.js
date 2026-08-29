#!/usr/bin/env node
/**
 * Cursor preToolUse hook — blocks edits to off-limits paths during modernization.
 */
const fs = require('fs');
const path = require('path');

function readInput() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8'));
  } catch {
    return {};
  }
}

function loadPatterns() {
  const rulesPath = path.join(__dirname, '..', 'off-limits-paths.json');
  try {
    const data = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    return data.paths || [];
  } catch {
    return ['**/*Controller.java', '**/dto/**', '**/db/migration/**'];
  }
}

function simpleGlobMatch(filePath, pattern) {
  const normalized = filePath.replace(/\\/g, '/');
  let regexStr = '';
  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === '*' && pattern[i + 1] === '*') {
      regexStr += '.*';
      i += 2;
      if (pattern[i] === '/') i += 1;
    } else if (pattern[i] === '*') {
      regexStr += '[^/]*';
      i += 1;
    } else if (pattern[i] === '.') {
      regexStr += '\\.';
      i += 1;
    } else {
      regexStr += pattern[i];
      i += 1;
    }
  }
  return new RegExp(`^${regexStr}$`).test(normalized);
}

function isOffLimits(filePath, patterns) {
  return patterns.some((p) => simpleGlobMatch(filePath, p));
}

function extractPaths(input) {
  const paths = [];
  const toolName = input.tool_name || input.tool || '';
  const toolInput = input.tool_input || input.arguments || input.input || {};

  if (toolName === 'Write' || toolName === 'StrReplace') {
    if (toolInput.path) paths.push(toolInput.path);
    if (toolInput.file_path) paths.push(toolInput.file_path);
  }

  if (toolName === 'Shell') {
    const cmd = toolInput.command || toolInput.cmd || '';
    const parts = cmd.split(/\s+/);
    for (let i = 0; i < parts.length; i++) {
      if ((parts[i] === '>' || parts[i] === '>>') && parts[i + 1]) {
        paths.push(parts[i + 1]);
      }
    }
  }

  return paths;
}

const input = readInput();
const patterns = loadPatterns();
const paths = extractPaths(input);

for (const p of paths) {
  if (isOffLimits(p, patterns)) {
    const response = {
      permission: 'deny',
      agent_message: `Blocked: ${p} is off-limits during modernization`,
      user_message: `Edit blocked: ${p} is protected during modernization.`,
    };
    process.stdout.write(JSON.stringify(response));
    process.exit(0);
  }
}

process.stdout.write(JSON.stringify({ permission: 'allow' }));
process.exit(0);
