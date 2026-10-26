const fs = require('fs');
const css = fs.readFileSync('animista_ref.css', 'utf8');

// Parse @keyframes blocks (dedupe by name, keep first non-prefixed occurrence).
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
      const key = d.slice(0, idx).trim().replace(/^-(webkit|moz|ms|o)-/, '');
      const val = d.slice(idx + 1).trim();
      if (!key) return;
      decls[key] = val;
    });
    stops.push({ pct, decls });
  }
  stops.sort((a, b) => a.pct - b.pct);
  return stops;
}

// Extract transform functions present across an animation.
function transformFuncs(stops) {
  const set = new Set();
  const props = new Set();
  stops.forEach((st) => {
    Object.keys(st.decls).forEach((k) => props.add(k));
    const t = st.decls.transform || st.decls['-webkit-transform'];
    if (t) {
      const fr = t.match(/[a-zA-Z3d]+3?\(/g) || [];
      fr.forEach((f) => set.add(f.slice(0, -1)));
    }
  });
  return { funcs: [...set], props: [...props] };
}

const allFuncs = new Set();
const allProps = new Set();
const zeroChannel = [];
const familyCount = {};
for (const [name, body] of blocks) {
  const stops = parseStops(body);
  const { funcs, props } = transformFuncs(stops);
  funcs.forEach((f) => allFuncs.add(f));
  props.forEach((p) => allProps.add(p));
  // Family = leading tokens before first direction-ish suffix.
  const fam = name.replace(/-(top|bottom|left|right|center|tl|tr|bl|br|fwd|bck|cw|ccw|hor|ver|vert|1|2|3|4|5|tr|bl|top-left|bottom-right|diagonal-1|diagonal-2|horizontal|vertical).*$/, '');
  familyCount[fam] = (familyCount[fam] || 0) + 1;
  const animatable = funcs.length > 0 || props.some((p) => ['opacity', 'filter', 'letter-spacing', 'background'].includes(p));
  if (!animatable) zeroChannel.push(name);
}

console.log('TOTAL:', blocks.size);
console.log('\nALL TRANSFORM FUNCS:', [...allFuncs].sort().join(', '));
console.log('\nALL PROPS:', [...allProps].sort().join(', '));
console.log('\nZERO-CHANNEL (need special handling):', zeroChannel.length);
zeroChannel.forEach((n) => console.log('   ', n));
console.log('\nFAMILIES (' + Object.keys(familyCount).length + '):');
Object.entries(familyCount).sort((a, b) => b[1] - a[1]).forEach(([f, c]) => console.log('  ', c.toString().padStart(3), f));
