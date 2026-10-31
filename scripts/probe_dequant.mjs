// 读取 Geely.glb，按 three.js 的方式反量化 (int16 * 1/32767)，应用节点世界矩阵，计算 glTF 世界包围盒
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('src/model/Geely.glb');
const root = doc.getRoot();

const newB = () => ({ min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] });
const fmt = (b) => {
  const c = [0,1,2].map(k => (b.min[k]+b.max[k])/2);
  return `x[${b.min[0].toFixed(4)},${b.max[0].toFixed(4)}] y[${b.min[1].toFixed(4)},${b.max[1].toFixed(4)}] z[${b.min[2].toFixed(4)},${b.max[2].toFixed(4)}]  center=(${c[0].toFixed(4)},${c[1].toFixed(4)},${c[2].toFixed(4)})`;
};

function nodeBounds(node, out) {
  const wm = node.getMesh();
  if (wm) {
    const mw = node.getWorldMatrix();
    for (const prim of wm.listPrimitives()) {
      const pos = prim.getAttribute('POSITION');
      if (!pos) continue;
      const arr = pos.getArray(); // Int16Array (normalized)
      const compType = pos.getComponentType();
      const isNorm = pos.getNormalized();
      let scale = 1;
      if (isNorm) {
        scale = compType === 5122 ? 1/32767 : compType === 5120 ? 1/127 : compType === 5121 ? 1/255 : compType === 5123 ? 1/65535 : 1;
      }
      for (let i = 0; i < arr.length; i += 3) {
        const px = arr[i]*scale, py = arr[i+1]*scale, pz = arr[i+2]*scale;
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

// 父节点名 -> 合并包围盒（用于按原始部件名定位）
const global = newB();
for (const s of root.listScenes()) for (const c of s.listChildren()) nodeBounds(c, global);
console.log('=== GLOBAL ===');
console.log(fmt(global));

// 命名部件：找到名字包含 key 的节点（含组节点），累加其整棵子树的包围盒
const keys = ['front seat', 'rear seat', 'ip', 'screen', 'inner top', 'windshield', 'headlamp', 'qianlian', 'houweiqi', 'rear tail', 'steer', 'roof', 'seatbelt'];
console.log('\n=== NAMED ===');
for (const k of keys) {
  const b = newB();
  const match = [];
  for (const n of root.listNodes()) {
    const name = (n.getName() || '').toLowerCase();
    if (name.includes(k)) match.push(n);
  }
  for (const n of match) nodeBounds(n, b);
  if (b.min[0] !== 1e9) console.log(k, `(${match.map(m=>m.getName()).join(' | ')})`, '=>', fmt(b));
}
