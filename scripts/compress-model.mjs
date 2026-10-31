/**
 * 吉利缤越 Coolray 模型压缩脚本
 * 流程：删除冗余 TANGENT → 逐 primitive 几何简化(容错) → meshopt 量化压缩 → 纹理转 WebP
 * 用法：node scripts/compress-model.mjs <input.glb> <output.glb> [simplifyRatio] [error]
 */
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { meshopt, textureCompress } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [inPath, outPath] = process.argv.slice(2);
const ratio = parseFloat(process.argv[3] || '0.35');
const errorLimit = parseFloat(process.argv[4] || '0.02');

await MeshoptEncoder.ready;
await MeshoptSimplifier.ready;
await MeshoptDecoder.ready;

const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({
    'meshopt.encoder': MeshoptEncoder,
    'meshopt.decoder': MeshoptDecoder,
  });

const doc = await io.read(inPath);
const root = doc.getRoot();

// 1) 删除无用 TANGENT（材质均无法线贴图）
let removed = 0;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getAttribute('TANGENT')) { prim.setAttribute('TANGENT', null); removed++; }
  }
}
console.log(`[1/4] removed TANGENT on ${removed} primitives`);

// 2) 逐 primitive 简化（ratio>=1 时跳过简化，仅用于清理属性）
let simpOk = 0, simpSkip = 0;
const reasons = {};
const countReason = (r) => { reasons[r] = (reasons[r] || 0) + 1; };
let firstErr = null;
const doSimplify = ratio < 1;
for (const mesh of root.listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (!doSimplify) { countReason('simplify-skipped'); simpSkip++; continue; }
    if (prim.getMode() !== 4) { countReason('mode'); simpSkip++; continue; }
    try {
      const pos = prim.getAttribute('POSITION');
      const idx = prim.getIndices();
      if (!pos || !idx) { countReason('noattr'); simpSkip++; continue; }
      let posArr = pos.getArray();
      let idxArr = idx.getArray();
      if (!(posArr instanceof Float32Array)) { countReason('posnotfloat'); simpSkip++; continue; }
      const idxCount = idxArr.length;
      if (idxCount < 6) { countReason('tiny'); simpSkip++; continue; }
      const targetCount = Math.max(0, Math.floor(ratio * idxCount / 3) * 3);
      if (targetCount >= idxCount) { countReason('nocut'); simpSkip++; continue; }
      let idx32 = idxArr;
      if (!(idx32 instanceof Uint32Array)) idx32 = new Uint32Array(idxArr);
      const [dst, err] = MeshoptSimplifier.simplify(idx32, posArr, 3, targetCount, errorLimit, ['LockBorder']);
      if (dst && dst.length % 3 === 0 && dst.length > 0) {
        prim.setIndices(idx.setArray(dst));
        simpOk++;
      } else { countReason('badout'); simpSkip++; }
    } catch (e) { countReason('throw:' + (e && e.message || e)); if(!firstErr) firstErr = e && e.message; simpSkip++; }
  }
}
console.log(`[2/4] simplified ${simpOk} primitives, skipped ${simpSkip}`, reasons, firstErr ? ('firstErr=' + firstErr) : '');

// 3) meshopt 量化压缩
await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
console.log('[3/4] meshopt quantized');

// 4) 纹理转 WebP
await doc.transform(textureCompress({ targetFormat: 'webp', encoder: sharp, resize: [2048, 2048] }));
console.log('[4/4] textures -> webp');

await io.write(outPath, doc);
console.log(`done -> ${outPath}`);
