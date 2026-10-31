// 用 gltf-transform 读取（要求 POSITION 为 float32 的模型），计算 glTF/three.js 原生坐标下的包围盒
// 用法: node scripts/probe_bounds2.mjs <glb>
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

const io = new NodeIO().registerExtensions([...KHRONOS_EXTENSIONS]);
const doc = await io.read(process.argv[2]);
const root = doc.getRoot();

function nodeBounds(node, out) {
  const wm = node.getMesh();
  if (wm) {
    for (const prim of wm.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const arr = pos.getArray();
      const mw = node.getWorldMatrix();
      for (let i = 0; i < arr.length; i += 3) {
        const px = arr[i], py = arr[i + 1], pz = arr[i + 2];
        const wx = mw[0]*px + mw[4]*py + mw[8]*pz + mw[12];
        const wy = mw[1]*px + mw[5]*py + mw[9]*pz + mw[13];
        const wz = mw[2]*px + mw[6]*py + mw[10]*pz + mw[14];
        out.min[0]=Math.min(out.min[0],wx); out.max[0]=Math.max(out.max[0],wx);
        out.min[1]=Math.min(out.min[1],wy); out.max[1]=Math.max(out.max[1],wy);
        out.min[2]=Math.min(out.min[2],wz); out.max[2]=Math.max(out.max[2],wz);
      }
    }
  }
  for (const c of node.listChildren()) nodeBounds(c, out);
}

const newB = () => ({ min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] });
const fmt = (b) => {
  const c = [0,1,2].map(k => (b.min[k]+b.max[k])/2);
  return `x[${b.min[0].toFixed(3)},${b.max[0].toFixed(3)}] y[${b.min[1].toFixed(3)},${b.max[1].toFixed(3)}] z[${b.min[2].toFixed(3)},${b.max[2].toFixed(3)}]  center=(${c[0].toFixed(3)},${c[1].toFixed(3)},${c[2].toFixed(3)})  size=(${(b.max[0]-b.min[0]).toFixed(3)},${(b.max[1]-b.min[1]).toFixed(3)},${(b.max[2]-b.min[2]).toFixed(3)})`;
};

const global = newB();
const keys = ['front seat', 'seat', 'ip', 'screen', 'inner top', 'windshield', 'headlamp', 'qianlian', 'houweiqi', 'rear tail', 'steer', 'roof', 'door', 'seatbelt'];
const named = {};
for (const n of root.listNodes()) {
  const name = (n.getName() || '').toLowerCase();
  const b = newB();
  nodeBounds(n, b);
  if (b.min[0] === 1e9) continue;
  for (const k of keys) {
    if (name.includes(k) && !named[n.getName()]) { named[n.getName()] = b; break; }
  }
  // 全局：只累加根节点（避免重复）
}
// 全局：从场景根算
for (const s of root.listScenes()) for (const c of s.listChildren()) nodeBounds(c, global);

console.log('=== GLOBAL (glTF Y-up) ===');
console.log(fmt(global));
console.log('\n=== NAMED ===');
for (const [name, b] of Object.entries(named)) console.log(name, '=>', fmt(b));
