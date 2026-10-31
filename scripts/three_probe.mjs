// 无头 three.js 加载 Geely.glb，打印 three.js 坐标系下的包围盒（与 app 一致）
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import fs from 'node:fs';

const buf = fs.readFileSync('src/model/Geely.glb');
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);

loader.parse(arrayBuffer, '', (gltf) => {
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  console.log('GLOBAL three.js  box min=', box.min.toArray().map(v=>v.toFixed(4)).join(','), ' max=', box.max.toArray().map(v=>v.toFixed(4)).join(','));
  console.log('size=', size.toArray().map(v=>v.toFixed(4)).join(','), ' center=', center.toArray().map(v=>v.toFixed(4)).join(','));

  const keys = ['front seat', 'seat', 'ip', 'screen', 'inner top', 'windshield', 'headlamp', 'qianlian', 'houweiqi', 'rear tail', 'steer', 'roof', 'door'];
  const norm = (s) => s.replace(/[_\s.\-]+/g, '').toLowerCase();
  const seen = new Set();
  root.traverse((o) => {
    if (!o.name) return;
    const n = norm(o.name);
    for (const k of keys) {
      if (n.includes(norm(k))) {
        const b = new THREE.Box3().setFromObject(o);
        if (b.isEmpty()) continue;
        const s = new THREE.Vector3(); b.getSize(s);
        const c = new THREE.Vector3(); b.getCenter(c);
        if (!seen.has(o.name)) { seen.add(o.name); console.log(`[${o.name}] center=(${c.x.toFixed(4)},${c.y.toFixed(4)},${c.z.toFixed(4)}) size=(${s.x.toFixed(4)},${s.y.toFixed(4)},${s.z.toFixed(4)})`); }
        break;
      }
    }
  });
}, (err) => { console.error('ERR', err); });
