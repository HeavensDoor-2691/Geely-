/** 打印完整节点树（含父节点名）*/
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP } from '@gltf-transform/extensions';
import { MeshoptDecoder, MeshoptEncoder } from 'meshoptimizer';
const p = process.argv[2];
await MeshoptDecoder.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions([...KHRONOS_EXTENSIONS, EXTMeshoptCompression, EXTTextureWebP]).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read(p);
const scene = doc.getRoot().listScenes()[0];
const walk = (n, d) => {
  const m = n.getMesh();
  console.log('  '.repeat(d) + (n.getName() || '(unnamed)') + (m ? '  [mesh]' : '') + (n.getSkin() ? ' [skin]' : ''));
  n.listChildren().forEach(c => walk(c, d+1));
};
scene.listChildren().forEach(c => walk(c, 0));
