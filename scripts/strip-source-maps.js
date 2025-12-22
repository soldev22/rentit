const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const res = [];
  if (!fs.existsSync(dir)) return res;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      res.push(...findFiles(full, pattern));
    } else if (pattern.test(full)) {
      res.push(full);
    }
  }
  return res;
}

function shouldRemoveSourceMap(line, fileDir) {
  const m = line.match(/sourceMappingURL=([^\s'"`]+)/);
  if (!m) return false;
  const url = m[1];
  if (url.startsWith('data:')) {
    const idx = url.indexOf(',');
    if (idx === -1) return true; // malformed data url
    const b64 = url.slice(idx + 1);
    try {
      Buffer.from(b64, 'base64').toString('utf8');
      return false;
    } catch (e) {
      return true;
    }
  }
  // else it's a file reference - check existence
  const mapPath = path.resolve(fileDir, url);
  if (!fs.existsSync(mapPath)) return true;
  try {
    JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    return false;
  } catch (e) {
    return true;
  }
}

function stripFromFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let changed = false;
  const newLines = lines.map((l) => {
    if (/sourceMappingURL=/.test(l)) {
      if (shouldRemoveSourceMap(l, path.dirname(file))) {
        changed = true;
        return ''; // remove the line
      }
    }
    return l;
  });
  if (changed) {
    fs.writeFileSync(file, newLines.join('\n'), 'utf8');
  }
  return changed;
}

function run() {
  const root = path.resolve(__dirname, '..');
  const target = path.join(root, '.next', 'dev', 'server', 'chunks', 'ssr');
  const files = findFiles(target, /\.js$/);
  let total = 0;
  for (const f of files) {
    const changed = stripFromFile(f);
    if (changed) {
      console.log('Stripped sourceMappingURL from', f);
      total++;
    }
  }
  if (total === 0) console.log('No malformed sourceMappingURL comments found.');
  else console.log(`Fixed ${total} files.`);
}

run();