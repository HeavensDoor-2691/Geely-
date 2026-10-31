import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO()
  .registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP])
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('src/model/Geely.glb');
const anim = doc.getRoot().listAnimations()[0];
const chan = anim.listChannels()[0];
console.log('CHANNEL methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(chan)));
const smp = chan.getSampler();
console.log('SAMPLER methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(smp)));
const out = smp.getOutput();
console.log('OUT accessor type=', out.getType(), 'count=', out.getCount());
console.log('OUT values head:', out.getArray().slice(0, 8));
