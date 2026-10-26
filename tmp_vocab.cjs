const fs = require('fs');
const css = fs.readFileSync('animista_ref.css', 'utf8');
const blocks = new Map();
const re = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{/g;
let m;
while ((m = re.exec(css))) {
  const name = m[1];
  let i = re.lastIndex, depth = 1;
  while (i < css.length && depth > 0) { if (css[i] === '{') depth++; else if (css[i] === '}') depth--; i++; }
  const body = css.slice(re.lastIndex, i - 1);
  if (!blocks.has(name)) blocks.set(name, body);
}
const funcs = new Set(), props = new Set(), units = new Set();
for (const [, body] of blocks) {
  const stopRe = /([0-9.]+%|to|from)\s*\{([^}]*)\}/g; let s;
  while ((s = stopRe.exec(body))) {
    s[2].split(';').forEach((d) => {
      const idx = d.indexOf(':'); if (idx < 0) return;
      const key = d.slice(0, idx).trim().replace(/^-(webkit|moz|ms|o)-/, '');
      const val = d.slice(idx + 1).trim(); if (!key) return;
      props.add(key);
      if (key === 'transform') {
        const fr = /([a-zA-Z0-9]+)\s*\(([^)]*)\)/g; let f;
        while ((f = fr.exec(val))) { funcs.add(f[1]); (f[2].match(/[a-z%]+/g) || []).forEach((u) => units.add(u)); }
      }
    });
  }
}
console.log('FUNCS:', [...funcs].sort().join(', '));
console.log('PROPS:', [...props].sort().join(', '));
console.log('UNITS:', [...units].sort().join(', '));
// rotate3d / translate3d / scale3d / skew single-arg examples
console.log('--- rotate3d ---'); for (const [n, b] of blocks) { const s = /rotate3d\(([^)]*)\)/.exec(b); if (s) { console.log(n, '=>', s[1]); break; } }
console.log('--- translate3d count ---', [...blocks].filter(([, b]) => /translate3d/.test(b)).length);
console.log('--- skew single arg ---'); for (const [n, b] of blocks) { const s = /skew\(([^)]*)\)/.exec(b); if (s && !s[1].includes(',')) { console.log(n, '=>', s[1]); break; } }
