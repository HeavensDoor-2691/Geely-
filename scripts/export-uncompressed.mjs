// 导出未压缩 GLB（去除 meshopt，供 Blender 渲染对比）
// 用法：node scripts/export-uncompressed.mjs <in.glb> <out.glb>
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const [inPath, outPath] = process.argv.slice(2);
const ioR = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const ioW = new NodeIO().registerExtensions([...KHRONOS_EXTENSIONS, EXTTextureWebP]);
const doc = await ioR.read(inPath);
await ioW.write(outPath, doc);
console.log('done ->', outPath);
