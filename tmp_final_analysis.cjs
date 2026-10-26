const fs = require('fs');
const d = JSON.parse(fs.readFileSync('tmp_anim_frames.json', 'utf8'));
const names = Object.keys(d);

// Collect transform function vocabulary
const tfuncs = new Set();
const props = new Set();
for (const n of names) {
  for (const s of d[n]) {
    for (const [k, v] of Object.entries(s.decls)) {
      props.add(k);
      if (k === 'transform') {
        const m = v.match(/[a-zA-Z]+\(/g) || [];
        m.forEach((f) => tfuncs.add(f));
      }
    }
  }
}
console.log('PROPS:', [...props].sort().join(', '));
console.log('TRANSFORM FUNCS:', [...tfuncs].sort().join(', '));

// Family detection: strip known direction/suffix tokens
function family(n) {
  return n
    .replace(/-(ccw|cw)$/, '')
    .replace(/-(horizontal|vertical)$/, '')
    .replace(/-(fwd|bck)$/, '')
    .replace(/-(tr|tl|br|bl|top|bottom|left|right|center|hor|ver|diag-1|diag-2|2-hor-top|2-hor-bottom|2-ver-right|2-ver-left|tb|lr)(-1|-2|-tr|-tl|-br|-bl|-top|-bottom|-left|-right|-center)?(-1|-2|-cw|-ccw)?$/, '');
}

// Group by coarse leading word
const fams = {};
for (const n of names) {
  const f = family(n);
  fams[f] = (fams[f] || 0) + 1;
}
console.log('\nFAMILIES:', Object.keys(fams).length);
console.log(Object.entries(fams).map(([f, c]) => `${f}(${c})`).sort().join(' '));

// Loop detection: first stop ≈ last stop (both near base identity)
function isIdentity(decls) {
  const t = (decls.transform || '').replace(/\s+/g, '');
  return (
    (t === 'none' || t === '' || /^(translate(3d)?\(0(p[xt]0)?(px)?,?0(p[xt]0)?(px)?\)?)?scale3d\(1,1,1\)rotate\(0(deg)?\)?$/.test(t) ||
      /scale\(1\)/.test(t) || t === undefined) &&
    (decls.opacity === undefined || decls.opacity === '1')
  );
}
let loopCand = [];
for (const n of names) {
  const stops = d[n];
  if (stops.length >= 3 && stops[0].pct === 0) {
    if (isIdentity(stops[0].decls) && isIdentity(stops[stops.length - 1].decls)) loopCand.push(n);
  }
}
console.log('\nLOOP CANDIDATES (0%=100%≈identity):', loopCand.length);
console.log(loopCand.sort().join(' '));
