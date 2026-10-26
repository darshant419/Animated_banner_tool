const fs = require('fs');
const t = fs.readFileSync('src/utils/animations.ts', 'utf8');
// match register(`id`  and register('id'
const m = [];
const re = /register\(\s*[`'"]([a-zA-Z0-9_\-]+)[`'"]/g;
let x;
while ((x = re.exec(t))) m.push(x[1]);
const unique = [...new Set(m)].sort();
console.log('COUNT', unique.length);
console.log(unique.join('\n'));
