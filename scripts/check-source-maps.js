const fs = require('fs');
const path = require('path');

function findFiles(dir, pattern) {
  const res = [];
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

function checkFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/).slice(-50); // last 50 lines
  const issues = [];
  for (const line of lines) {
    const m = line.match(/sourceMappingURL=([^\s'"`]+|data:.*)$/);
    if (m) {
      const url = m[1];
      // If data: try to parse base64 after last comma
      if (url.startsWith('data:')) {
        const idx = url.indexOf(',');
        if (idx === -1) {
          issues.push({ type: 'invalid-data-url', text: url });
          continue;
        }
        const b64 = url.slice(idx + 1);
        try {
          Buffer.from(b64, 'base64').toString('utf8');
        } catch (e) {
          issues.push({ type: 'bad-base64', text: url, err: String(e) });
        }
      } else {
        // treat as file path relative to file
        const mapPath = path.resolve(path.dirname(file), url);
        if (!fs.existsSync(mapPath)) {
          issues.push({ type: 'missing-map-file', text: url, resolved: mapPath });
        } else {
          // try to parse JSON
          try {
            JSON.parse(fs.readFileSync(mapPath, 'utf8'));
          } catch (e) {
            issues.push({ type: 'invalid-json', text: url, err: String(e) });
          }
        }
      }
    }
  }
  return issues;
}

function run() {
  const root = path.resolve(__dirname, '..');
  const target = path.join(root, '.next', 'dev', 'server', 'chunks', 'ssr');
  if (!fs.existsSync(target)) {
    console.error('No dev SSR chunks found at', target);
    process.exit(0);
  }
  const files = findFiles(target, /\.js$/);
  const results = [];
  for (const f of files) {
    const issues = checkFile(f);
    if (issues.length) results.push({ file: f, issues });
  }
  if (results.length === 0) {
    console.log('No obvious source map parsing issues found in SSR chunk files.');
    process.exit(0);
  }

  console.log('Potential issues found:');
  for (const r of results) {
    console.log('\nFile:', r.file);
    for (const it of r.issues) {
      console.log(' -', it.type, it.text, it.resolved ? `-> ${it.resolved}` : '', it.err ? `ERR: ${it.err}` : '');
    }
  }
}

run();