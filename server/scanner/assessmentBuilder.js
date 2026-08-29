function buildAssessment(repoInfo, scanResult, safetySeeded) {
  const { scanData, components } = scanResult;
  const risks = [];

  const javaMajor = scanData.javaVersion?.startsWith('1.')
    ? parseInt(scanData.javaVersion.split('.')[1], 10)
    : parseInt(scanData.javaVersion, 10);

  if (javaMajor && javaMajor <= 8) {
    risks.push({
      level: 'high',
      message: 'Java 8 is EOL; blocks Spring Boot 3 migration',
    });
  }

  if (scanData.springBootVersion) {
    const bootMajor = parseInt(scanData.springBootVersion.split('.')[0], 10);
    if (bootMajor <= 2) {
      risks.push({
        level: 'high',
        message: `Spring Boot ${scanData.springBootVersion} is outdated; Jakarta EE migration required for v3`,
      });
    }
  }

  if (scanData.logging === 'Log4j 1.x') {
    risks.push({
      level: 'med',
      message: 'Log4j 1.x has known security vulnerabilities; migrate to Log4j2',
    });
  }

  if (scanData.testFramework === 'JUnit 4') {
    risks.push({
      level: 'med',
      message: 'JUnit 4 is legacy; JUnit 5 recommended for Spring Boot 3',
    });
  }

  if (scanData.multiModule) {
    risks.push({
      level: 'low',
      message: 'Multi-module Maven project detected; upgrades may span multiple pom.xml files',
    });
  }

  const recommendedOrder = ['java-runtime', 'spring-boot', 'junit', 'logging'].filter((id) =>
    components.some((c) => c.id === id)
  );

  return {
    repo: {
      name: repoInfo.name,
      branch: repoInfo.branch,
      url: repoInfo.url,
      owner: repoInfo.owner,
    },
    characterizationStatus: 'not_started',
    safetySeeded,
    stack: {
      javaVersion: scanData.javaVersion,
      springBootVersion: scanData.springBootVersion || 'Not detected',
      buildTool: 'Maven',
      testFramework: scanData.testFramework,
      logging: scanData.logging,
    },
    structure: {
      pomFiles: scanData.pomFiles,
      javaSourceFiles: scanData.javaSourceFiles,
      testFiles: scanData.testFiles,
      hasCi: scanData.hasCi,
      multiModule: scanData.multiModule,
    },
    risks,
    recommendedOrder,
    components,
    componentCount: components.length,
  };
}

module.exports = { buildAssessment };
