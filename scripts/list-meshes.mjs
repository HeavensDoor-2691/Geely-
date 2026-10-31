// 列出 glb 中每个 mesh 的名称、顶点数、包围盒（用于定位引擎盖所在 mesh）
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read(process.argv[2]);
const root = doc.getRoot();
let total = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    const pos = prim.getAttribute('POSITION');
    if (!pos) continue;
    const arr = pos.getArray();
    const v = arr.length / 3;
    let min = [1e9, 1e9, 1e9], max = [-1e9, -1e9, -1e9];
    for (let i = 0; i < arr.length; i += 3) {
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], arr[i + k]); max[k] = Math.max(max[k], arr[i + k]); }
    }
    console.log(`${mesh.getName() || '(unnamed)'} | verts=${v} | x[${min[0].toFixed(2)},${max[0].toFixed(2)}] y[${min[1].toFixed(2)},${max[1].toFixed(2)}] z[${min[2].toFixed(2)},${max[2].toFixed(2)}]`);
    total += v;
  }
}
console.log('TOTAL verts', total);
