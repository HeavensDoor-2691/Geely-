/** 验证压缩后模型的节点/材质/动画结构 */
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { MeshoptEncoder } from 'meshoptimizer';

const p = process.argv[2];
await MeshoptDecoder.ready;
await MeshoptEncoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(p);
const root = doc.getRoot();
console.log('scenes', root.listScenes().length);
console.log('nodes', root.listNodes().length);
console.log('meshes', root.listMeshes().length);
console.log('materials', root.listMaterials().length);
console.log('animations', root.listAnimations().length, root.listAnimations().map(a=>a.getName()));
// vertex count
let vc = 0; const mats = new Set();
for (const m of root.listMeshes()) {
  for (const prim of m.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (pos) vc += pos.getCount();
    const mat = prim.getMaterial();
    if (mat) mats.add(mat.getName());
  }
}
console.log('total vertices', vc.toLocaleString());
console.log('material names:', [...mats].join(' | '));
// node names (that carry mesh), show up to 200
const named = [];
for (const n of root.listNodes()) { if (n.getMesh()) named.push(n.getName() || '(unnamed)'); }
console.log('named mesh nodes (' + named.length + '):');
console.log(named.slice(0, 220).join(' | '));
