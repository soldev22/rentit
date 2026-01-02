// scripts/generate-architecture-overview.js
// Node.js script to auto-generate COPILOT_ARCHITECTURE_OVERVIEW.md with full file/folder listing

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'COPILOT_ARCHITECTURE_OVERVIEW.md');

function walk(dir, prefix = '') {
  let result = '';
  const files = fs.readdirSync(dir, { withFileTypes: true });
  files.sort((a, b) => a.name.localeCompare(b.name));
  for (const file of files) {
    if (file.name.startsWith('.')) continue; // skip dotfiles
    const rel = path.join(prefix, file.name);
    if (file.isDirectory()) {
      result += `- ${rel}/\n`;
      result += walk(path.join(dir, file.name), rel);
    } else {
      result += `  - ${rel}\n`;
    }
  }
  return result;
}

const header = `# RENTSIMPLE PROJECT ARCHITECTURE OVERVIEW\n\n` +
`**Generated:** ${new Date().toISOString()}\n\n` +
`## Key Conventions\n` +
`- Next.js 13+ (App Router, TypeScript)\n- MongoDB via mongodb driver\n- NextAuth.js (credentials, roles, JWT, MongoDB adapter)\n- Tailwind CSS, Geist font\n- Role-based routing: /admin, /landlord, /tenant, /agent, /dashboard, etc.\n- Zod for input validation\n- All DB access via src/lib/\n\n` +
`## Main Directories & Files\n`;

const tree = walk(path.join(ROOT, 'src'));

const out = header + '\n' + 'src/\n' + tree + '\n---\n\nTo update: Run `node scripts/generate-architecture-overview.js`\n';

fs.writeFileSync(OUTPUT, out);
console.log('COPILOT_ARCHITECTURE_OVERVIEW.md updated.');
