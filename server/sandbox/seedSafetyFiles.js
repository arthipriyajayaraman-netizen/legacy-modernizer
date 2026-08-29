const fs = require('fs');
const path = require('path');
const config = require('../config');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

function seedSafetyFiles(clonePath) {
  const templateDir = config.templatesDir;
  if (!fs.existsSync(templateDir)) {
    return { seeded: false, error: 'Template directory not found' };
  }

  copyRecursive(templateDir, clonePath);

  return { seeded: true };
}

module.exports = { seedSafetyFiles };
