const fs = require('fs');
const data = JSON.parse(fs.readFileSync('tmp_anim_frames.json', 'utf8'));

const names = Object.keys(data);

// Normalize 3d fns to their 2D-equivalent token for vocab counting.
const norm = (t) => t.replace(/3d/, '');
const funcCount = {};
const propCount = {};
const animInfo = [];

const parseTransform = (str) => {
  const fns = [];
  const re = /([a-zA-Z0-9]+)\s*\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(str))) fns.push({ fn: m[1], args: m[2] });
  return fns;
};

for (const name of names) {
  const stops = data[name];
  const funcs = new Set();
  const props = new Set();
  let hasAnimOrigin = false;
  for (const st of stops) {
    for (const [k, v] of Object.entries(st.decls)) {
      if (k === 'transform') {
        for (const f of parseTransform(v)) funcs.add(norm(f.fn));
      } else {
        props.add(k);
      }
      if (k === 'transform-origin') hasAnimOrigin = true;
    }
  }
  for (const f of funcs) funcCount[f] = (funcCount[f] || 0) + 1;
  for (const p of props) propCount[p] = (propCount[p] || 0) + 1;
  animInfo.push({ name, funcs: [...funcs], props: [...props], stops: stops.length });
}

console.log('=== TOTAL ANIMS:', names.length, '===\n');
console.log('=== TRANSFORM FNS (normalized) ===');
Object.entries(funcCount).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(v.toString().padStart(4), k));
console.log('\n=== CSS PROPS ===');
Object.entries(propCount).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(v.toString().padStart(4), k));

// Family = strip trailing direction tokens and numeric suffixes
const DIRS = ['top-left','top-right','bottom-left','bottom-right','top','bottom','left','right','center',
  'tr','tl','br','bl','top-bck','bottom-bck','right-bck','left-bck','center-bck','fwd','bck',
  'hor-left','hor-right','ver-top','ver-bottom','diag-1','diag-2','horizontal','vertical','diagonal',
  'ccw','cw','top-bck','br-ccw','bl-ccw','tr-ccw','tl-ccw','fwd-bck','bck-fwd'];
const fam = (n) => {
  let s = n.replace(/-(\d+)$/, ''); // strip trailing number
  for (const d of [...DIRS].sort((a,b)=>b.length-a.length)) {
    if (s.endsWith('-' + d)) { s = s.slice(0, -(d.length+1)); break; }
  }
  return s;
};
const fams = {};
for (const a of animInfo) {
  const f = fam(a.name);
  if (!fams[f]) fams[f] = { count: 0, props: new Set(), funcs: new Set(), stopCounts: new Set() };
  fams[f].count++;
  a.props.forEach(p=>fams[f].props.add(p));
  a.funcs.forEach(x=>fams[f].funcs.add(x));
  fams[f].stopCounts.add(a.stops);
}
console.log('\n=== FAMILIES ===', Object.keys(fams).length, '===');
Object.entries(fams).sort((a,b)=>b[1].count-a[1].count).forEach(([k,v])=>{
  console.log(`${v.count.toString().padStart(3)}  ${k.padEnd(28)} fns=[${[...v.funcs].join(',')}] props=[${[...v.props].join(',')}] stops=${[...v.stopCounts].join('/')}`);
});
