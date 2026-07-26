const fs = require('fs');
const path = require('path');

let cachedVersion = null;

function getAppVersion() {
  if (cachedVersion) return cachedVersion;
  for (const file of ['VERSION.txt', 'VERSION']) {
    try {
      const value = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').trim();
      if (value) {
        cachedVersion = value;
        return cachedVersion;
      }
    } catch (_) {}
  }
  cachedVersion = 'unknown';
  return cachedVersion;
}

module.exports = { getAppVersion };
