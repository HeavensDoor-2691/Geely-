/** 分析 GLB 动画中"门"相关轨道的张角时间区间 */
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';

await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });

const doc = await io.read('src/model/Geely.glb');
const anims = doc.getRoot().listAnimations();
console.log('动画数:', anims.length);
for (const anim of anims) {
  const chans = anim.listChannels();
  let duration = 0;
  for (const c of chans) { const a = c.getSampler().getInput().getArray(); if (a && a.length) duration = Math.max(duration, a[a.length - 1]); }
  console.log('\n动画:', anim.getName(), '时长:', duration.toFixed(2));
  console.log('通道数:', chans.length);
  for (const chan of chans) {
    const t = chan.getTargetNode();
    const path = chan.getPath();
    const name = t ? t.getName() : '?';
    if (/door|Door/i.test(name)) {
      const out = chan.getSampler().getOutput().getArray();
      const inp = chan.getSampler().getInput().getArray();
      if (path === 'rotation' && out) {
        let best = { i: 0, ang: 0 };
        for (let i = 0; i < out.length; i += 4) {
          const w = out[i + 3] || 0;
          const ang = 2 * Math.acos(Math.min(1, Math.abs(w)));
          if (ang > best.ang) { best.ang = ang; best.i = i / 4; }
        }
        console.log(`  [门] ${name} -> ${path}: 最大张角=${best.ang.toFixed(2)}rad @ time=${inp[best.i].toFixed(2)}s / ${duration.toFixed(2)}s`);
      } else {
        console.log(`  [门] ${name} -> ${path}: 关键帧数=${out ? Math.round(out.length / 3) : 0}`);
      }
    }
  }
}
