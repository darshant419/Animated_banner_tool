const fs = require('fs');
const d = JSON.parse(fs.readFileSync('tmp_anim_frames.json', 'utf8'));
const want = ['flip-horizontal-bottom', 'flip-diagonal-1-tr', 'flip-in-hor-bottom', 'rotate-in-2-cw', 'slide-in-blurred-tl', 'shake-horizontal', 'jello-horizontal', 'color-change-2x', 'bg-pan-left', 'tracking-in-expand', 'text-shadow-pop-top', 'text-pop-up-top', 'swing-top-fwd', 'slide-in-elliptic-top-fwd', 'kenburns-top', 'puff-in-center', 'roll-in-left', 'fade-in-bck'];
for (const k of want) {
  if (d[k]) { console.log('=== ' + k + ' ==='); console.log(JSON.stringify(d[k])); }
  else console.log('MISSING ' + k);
}
