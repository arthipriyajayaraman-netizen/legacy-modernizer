const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const config = require('../config');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
});

function findFiles(dir, pattern, results = []) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'target') continue;
      findFiles(full, pattern, results);
    } else if (pattern.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

function parsePom(pomPath) {
  const content = fs.readFileSync(pomPath, 'utf8');
  return parser.parse(content);
}

function getTextValue(node) {
  if (node == null) return null;
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (node['#text']) return String(node['#text']);
  return null;
}

function extractJavaVersion(pom) {
  const props = pom.project?.properties || {};
  const fromProp = getTextValue(props['java.version']) ||
    getTextValue(props['maven.compiler.source']) ||
    getTextValue(props['maven.compiler.target']);
  if (fromProp) return normalizeJavaVersion(fromProp);

  const build = pom.project?.build || {};
  const plugins = build.plugins || [];
  const pluginList = Array.isArray(plugins) ? plugins : [plugins];
  for (const plugin of pluginList) {
    const artifactId = getTextValue(plugin.artifactId);
    if (artifactId === 'maven-compiler-plugin') {
      const cfg = plugin.configuration || {};
      const src = getTextValue(cfg.source) || getTextValue(cfg['maven.compiler.source']);
      if (src) return normalizeJavaVersion(src);
    }
  }
  return null;
}

function normalizeJavaVersion(v) {
  const s = String(v).trim();
  if (s === '1.8' || s === '8') return '1.8';
  if (s === '1.7' || s === '7') return '1.7';
  return s;
}

function parseJavaMajor(version) {
  if (!version) return null;
  if (version.startsWith('1.')) return parseInt(version.split('.')[1], 10);
  return parseInt(version.split('.')[0], 10);
}

function extractSpringBootVersion(pom) {
  const parent = pom.project?.parent;
  if (!parent) return null;
  const artifactId = getTextValue(parent.artifactId);
  if (artifactId === 'spring-boot-starter-parent') {
    return getTextValue(parent.version);
  }
  return null;
}

function extractDependencies(pom) {
  const deps = pom.project?.dependencies?.dependency || [];
  return Array.isArray(deps) ? deps : deps ? [deps] : [];
}

function hasDependency(deps, groupId, artifactId) {
  return deps.some((d) => {
    const g = getTextValue(d.groupId);
    const a = getTextValue(d.artifactId);
    return g === groupId && a === artifactId;
  });
}

function detectTestFramework(deps) {
  if (hasDependency(deps, 'org.junit.jupiter', 'junit-jupiter') ||
      hasDependency(deps, 'org.junit.jupiter', 'junit-jupiter-api')) {
    return 'JUnit 5';
  }
  if (hasDependency(deps, 'junit', 'junit')) {
    return 'JUnit 4';
  }
  return 'Unknown';
}

function detectLogging(pom, clonePath, deps) {
  const log4j1Props = findFiles(clonePath, /^log4j\.properties$/);
  if (log4j1Props.length > 0 || hasDependency(deps, 'log4j', 'log4j')) {
    return 'Log4j 1.x';
  }
  if (hasDependency(deps, 'org.apache.logging.log4j', 'log4j-core')) {
    return 'Log4j2';
  }
  if (hasDependency(deps, 'ch.qos.logback', 'logback-classic') ||
      hasDependency(deps, 'org.springframework.boot', 'spring-boot-starter-logging')) {
    return 'Logback';
  }
  return 'Unknown';
}

function countJavaFiles(clonePath) {
  const all = findFiles(clonePath, /\.java$/);
  const test = all.filter((f) => f.includes(`${path.sep}test${path.sep}`));
  const main = all.filter((f) => !f.includes(`${path.sep}test${path.sep}`));
  return { main: main.length, test: test.length, total: all.length };
}

function hasCi(clonePath) {
  const ciPaths = [
    '.github/workflows',
    'Jenkinsfile',
    '.gitlab-ci.yml',
    'azure-pipelines.yml',
  ];
  return ciPaths.some((p) => fs.existsSync(path.join(clonePath, p)));
}

function loadComponentRules() {
  const rulesPath = path.join(config.rulesDir, 'java-maven.json');
  return JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
}

function matchComponents(scanData, rules) {
  const components = [];
  const { javaVersion, springBootVersion, testFramework, logging } = scanData;

  for (const rule of rules.components) {
    let matched = false;
    const current = rule.detect;

    if (current.type === 'java-version') {
      const major = parseJavaMajor(javaVersion);
      if (major && major <= (current.maxVersion || 11)) {
        matched = true;
        components.push({
          id: rule.id,
          name: rule.name,
          path: rule.path,
          current: javaVersion === '1.8' ? 'Java 8' : `Java ${major}`,
          suggested: rule.suggested,
          impact: rule.impact,
          requires: rule.requires || [],
        });
      }
    }

    if (current.type === 'spring-boot' && springBootVersion) {
      const major = parseInt(springBootVersion.split('.')[0], 10);
      if (major <= (current.maxMajor || 2)) {
        matched = true;
        components.push({
          id: rule.id,
          name: rule.name,
          path: rule.path,
          current: `Spring Boot ${springBootVersion}`,
          suggested: rule.suggested,
          impact: rule.impact,
          requires: rule.requires || [],
        });
      }
    }

    if (current.type === 'junit') {
      if (testFramework === 'JUnit 4' || testFramework === 'JUnit 3') {
        matched = true;
        components.push({
          id: rule.id,
          name: rule.name,
          path: rule.path,
          current: testFramework,
          suggested: rule.suggested,
          impact: rule.impact,
          requires: rule.requires || [],
        });
      }
    }

    if (current.type === 'log4j1' && logging === 'Log4j 1.x') {
      matched = true;
      components.push({
        id: rule.id,
        name: rule.name,
        path: rule.path,
        current: 'Log4j 1.2.x',
        suggested: rule.suggested,
        impact: rule.impact,
        requires: rule.requires || [],
      });
    }

    void matched;
  }

  return components;
}

function scanMavenRepo(clonePath) {
  const pomFiles = findFiles(clonePath, /^pom\.xml$/);
  if (pomFiles.length === 0) {
    throw new Error('V1 supports Java/Maven only; no pom.xml found');
  }

  const rootPom = pomFiles.find((p) => {
    const rel = path.relative(clonePath, p);
    return rel === 'pom.xml' || !rel.includes(path.sep);
  }) || pomFiles[0];

  const pom = parsePom(rootPom);
  const deps = extractDependencies(pom);
  const javaVersion = extractJavaVersion(pom) || '1.8';
  const springBootVersion = extractSpringBootVersion(pom);
  const testFramework = detectTestFramework(deps);
  const logging = detectLogging(pom, clonePath, deps);
  const javaCounts = countJavaFiles(clonePath);

  const scanData = {
    javaVersion,
    springBootVersion,
    testFramework,
    logging,
    pomFiles: pomFiles.length,
    javaSourceFiles: javaCounts.main,
    testFiles: javaCounts.test,
    hasCi: hasCi(clonePath),
    multiModule: pomFiles.length > 1,
  };

  const rules = loadComponentRules();
  const components = matchComponents(scanData, rules);

  return { scanData, components };
}

module.exports = { scanMavenRepo, findFiles };
