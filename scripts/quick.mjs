import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP]).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('src/model/Geely.glb');
const root = doc.getRoot();
let m = 0, g = 0;
for (const n of root.listNodes()) {
  const name = n.getName() || '';
  if (/Wheel|wheel|Inner|inner|Tail|tail|Logo|logo|Head|head|Sun|sun|Seat|seat|Rear/i.test(name)) {
    const kind = n.getMesh() ? 'M' : 'G';
    if (n.getMesh()) m++; else g++;
    console.log(`  [${kind}] ${name}`);
  }
}
console.log('matched mesh=', m, 'group=', g);
