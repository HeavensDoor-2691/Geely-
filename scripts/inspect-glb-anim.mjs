/** 用 gltf-transform 解码动画，量化门节点在各时间的位移/张角，定位"打开"区间 */
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('src/model/Geely.glb');
const anim = doc.getRoot().listAnimations()[0];
const chans = anim.listChannels();
let duration = 0;
for (const c of chans) { const a = c.getSampler().getInput().getArray(); duration = Math.max(duration, a[a.length - 1]); }
console.log('时长:', duration.toFixed(2));

function sampleTrans(values, numComp, t, times) {
  // 线性插值
  let i = 0;
  while (i < times.length - 1 && times[i + 1] < t) i++;
  const i0 = i, i1 = Math.min(i + 1, times.length - 1);
  const f = times[i1] === times[i0] ? 0 : (t - times[i0]) / (times[i1] - times[i0]);
  const out = [];
  for (let k = 0; k < numComp; k++) out.push(values[i0*numComp+k] + (values[i1*numComp+k]-values[i0*numComp+k])*f);
  return out;
}

const probes = [0, 0.2, 0.35, 0.45, 0.5, 0.6, 0.75, 0.9, 1];
console.log('\n各门节点在动画中的位移幅度（相对 t=0，单位=场景单位）:');
for (const chan of chans) {
  const t = chan.getTargetNode();
  const name = t ? t.getName() : '';
  if (!/Door_FL_Body|Door_FR_Body|Door_RL_Body|Door_RR|Tailgate|SunRoof/i.test(name)) continue;
  const path = chan.getTargetPath();
  const smp = chan.getSampler();
  const times = smp.getInput().getArray();
  const values = smp.getOutput().getArray();
  const numComp = smp.getOutput().getType() === 'VEC4' ? 4 : 3;
  const base = values.slice(0, numComp);
  if (path === 'rotation') {
    const w0 = base[3];
    const a0 = 2 * Math.acos(Math.min(1, Math.abs(w0)));
    const seg = probes.map(p => {
      const t0 = p * duration;
      const v = sampleTrans(values, 4, t0, times);
      const a = 2 * Math.acos(Math.min(1, Math.abs(v[3])));
      return Math.abs(a - a0).toFixed(2);
    });
    console.log(`  ${name}.rot  张角变化 @[0,20,35,45,50,60,75,90,100]% = [${seg.join(',')}]`);
  } else if (path === 'translation') {
    const seg = probes.map(p => {
      const t0 = p * duration;
      const v = sampleTrans(values, 3, t0, times);
      return Math.hypot(v[0]-base[0], v[1]-base[1], v[2]-base[2]).toFixed(3);
    });
    console.log(`  ${name}.tr   位移 @[0,20,35,45,50,60,75,90,100]% = [${seg.join(',')}]`);
  }
}
