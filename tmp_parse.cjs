const fs = require('fs');
const css = fs.readFileSync('animista_ref.css', 'utf8');

// Grab every @keyframes block (non-prefixed). De-dupe by name.
const blocks = new Map();
const re = /@keyframes\s+([a-zA-Z0-9_-]+)\s*\{/g;
let m;
while ((m = re.exec(css))) {
  const name = m[1];
  let i = re.lastIndex, depth = 1;
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') depth--;
    i++;
  }
  const body = css.slice(re.lastIndex, i - 1);
  if (!blocks.has(name)) blocks.set(name, body);
}

// Parse each stop (0%, 50%, to) into declaration map.
function parseStops(body) {
  const stops = [];
  const stopRe = /([0-9.]+%|to|from)\s*\{([^}]*)\}/g;
  let s;
  while ((s = stopRe.exec(body))) {
    let pct = s[1] === 'to' ? 100 : s[1] === 'from' ? 0 : parseFloat(s[1]);
    const decls = {};
    s[2].split(';').forEach((d) => {
      const idx = d.indexOf(':');
      if (idx < 0) return;
      let key = d.slice(0, idx).trim().replace(/^-(webkit|moz|ms|o)-/, '');
      let val = d.slice(idx + 1).trim();
      if (!key) return;
      // Keep only standard props (last -webkit- wins) — later decls override
      decls[key] = val;
    });
    stops.push({ pct, decls });
  }
  stops.sort((a, b) => a.pct - b.pct);
  return stops;
}

const out = {};
for (const [name, body] of blocks) out[name] = parseStops(body);

// Print a few tricky ones raw
const samples = ['scale-up-center', 'rotate-90-horizontal-fwd', 'slide-in-blurred-bl', 'color-change-2x', 'text-shadow-pop-top', 'tracking-in-expand', 'bg-pan-left', 'flip-scale-2-hor-top', 'kenburns-bottom', 'swirl-in-fwd', 'jello-horizontal', 'slide-in-fwd-tr', 'shadow-inset-center', 'puff-out-center'];
for (const n of samples) {
  console.log('\n=== ' + n + ' ===');
  console.log(JSON.stringify(out[n], null, 1));
}
console.log('\nTOTAL UNIQUE:', blocks.size);
