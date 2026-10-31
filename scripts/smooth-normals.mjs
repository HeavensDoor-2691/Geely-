// 平滑法线脚本（保留节点名）：对几何应用 normals(smoothAngle)，再 meshopt 压缩
// 用法：node scripts/smooth-normals.mjs <in.glb> <out.glb> [angle]
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { normals, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder } from 'meshoptimizer';

await MeshoptEncoder.ready;
await MeshoptDecoder.ready;
const [inPath, outPath, angle] = process.argv.slice(2);
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read(inPath);
await doc.transform(normals({ smoothAngle: parseFloat(angle || '30') }));
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outPath, doc);
console.log('done ->', outPath);
