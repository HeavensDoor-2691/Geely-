// 用 gltf-transform 解码 meshopt 后，读取真实顶点包围盒（glTF 原生坐标系，Y-up）
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read('src/model/Geely.glb');
const root = doc.getRoot();

// 先看一个 POSITION accessor 的类型与最小/最大值
for (const mesh of root.listMeshes().slice(0, 3)) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const mn = new Float32Array(3), mx = new Float32Array(3);
    console.log('acc type=', pos.getType(), 'componentType=', pos.getComponentType(), 'normalized=', pos.getNormalized(), 'min=', Array.from(pos.getMin(mn)).slice(0,3), 'max=', Array.from(pos.getMax(mx)).slice(0,3), 'head=', Array.from(pos.getArray().slice(0,3)));
  }
  break;
}

// 全局 & 命名节点包围盒（世界）
function nodeWorldBounds(node, out) {
  const mw = node.getWorldMatrix();
  const wm = node.getMesh();
  if (!wm) return;
  for (const prim of wm.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const mn = new Float32Array(3); const mx = new Float32Array(3);
    pos.getMin(mn); pos.getMax(mx);
    if (mn[0] === Infinity || mx[0] === -Infinity) continue;
    // 8 个角点变换到世界
    for (let i = 0; i < 8; i++) {
      const p = [
        i & 1 ? mx[0] : mn[0],
        i & 2 ? mx[1] : mn[1],
        i & 4 ? mx[2] : mn[2],
      ];
      const w = [
        mw[0]*p[0] + mw[4]*p[1] + mw[8]*p[2] + mw[12],
        mw[1]*p[0] + mw[5]*p[1] + mw[9]*p[2] + mw[13],
        mw[2]*p[0] + mw[6]*p[1] + mw[10]*p[2] + mw[14],
      ];
      for (let k = 0; k < 3; k++) {
        out.min[k] = Math.min(out.min[k], w[k]);
        out.max[k] = Math.max(out.max[k], w[k]);
      }
    }
  }
}

const global = { min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] };
const keys = ['front seat', 'seat', 'ip', 'screen', 'inner top', 'windshield', 'headlamp', 'qianlian', 'houweiqi', 'rear tail', 'steer', 'roof', 'door'];
const named = {};
for (const n of root.listNodes()) {
  nodeWorldBounds(n, global);
  const name = (n.getName() || '').toLowerCase();
  for (const k of keys) {
    if (name.includes(k)) {
      const b = { min: [1e9,1e9,1e9], max: [-1e9,-1e9,-1e9] };
      nodeWorldBounds(n, b);
      if (b.min[0] !== 1e9) named[n.getName()] = b;
      break;
    }
  }
}
const fmt = (b) => {
  const c = [0,1,2].map(k => (b.min[k]+b.max[k])/2);
  return `x[${b.min[0].toFixed(3)},${b.max[0].toFixed(3)}] y[${b.min[1].toFixed(3)},${b.max[1].toFixed(3)}] z[${b.min[2].toFixed(3)},${b.max[2].toFixed(3)}]  center=(${c[0].toFixed(3)},${c[1].toFixed(3)},${c[2].toFixed(3)})  size=(${(b.max[0]-b.min[0]).toFixed(3)},${(b.max[1]-b.min[1]).toFixed(3)},${(b.max[2]-b.min[2]).toFixed(3)})`;
};
console.log('\n=== GLOBAL ===');
console.log(fmt(global));
console.log('\n=== NAMED ===');
for (const [name, b] of Object.entries(named)) console.log(name, '=>', fmt(b));
