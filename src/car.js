import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

/**
 * 展车管理：加载 GLB、按部件定位、颜色/轮毂/车门配置切换
 */
export class CarManager {
  constructor(scene) {
    this.scene = scene;
    this.group = null;
    this.mixer = null;
    this.actions = {};
    this.clipDuration = 0;
    // 部件集合
    this.paintMeshes = [];
    this.wheelMeshes = [];
    this.parts = {}; // name -> Object3D
    this.paintBaseColor = null;
    this.doorGroups = [];
    this.doorOpen = false;
    this.doorProgress = 0;
  }

  /** 加载模型 */
  load(url, onProgress) {
    return new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.setMeshoptDecoder(MeshoptDecoder);
      loader.load(
        url,
        (gltf) => {
          const group = gltf.scene;
          group.traverse((o) => {
            if (o.isMesh) {
              o.castShadow = true;
              o.receiveShadow = true;
            }
          });
          this.group = group;
          this.scene.add(group);

          // 收集部件
          this.collectParts(group);
          this.collectPaintMeshes(group);
          this.collectWheelMeshes(group);
          this.collectDoorGroups(group);

          // 动画（车门改为手动 transform 驱动，动画轨道在部分压缩模型上不可靠）
          if (gltf.animations && gltf.animations.length) {
            this.mixer = new THREE.AnimationMixer(group);
          }
          resolve(gltf);
        },
        onProgress,
        (err) => reject(err)
      );
    });
  }

  /** 按节点名定位部件（规范化忽略下划线/空格/大小写） */
  collectParts(root) {
    const map = {};
    const keys = ['HeadLamp', 'Wheel hub', 'Inner top', 'Rear Tail Light', 'SunRoof', 'Rear Logo', 'Front seat'];
    const norm = (s) => s.replace(/[_\s.\-]+/g, '').toLowerCase();
    root.traverse((o) => {
      if (!o.name) return;
      const n = norm(o.name);
      for (const key of keys) {
        if (n.includes(norm(key)) && !map[key]) map[key] = o;
      }
    });
    this.parts = map;
  }

  /** 收集所有车漆部件下的 mesh */
  collectPaintMeshes(root) {
    const meshes = [];
    const find = (o) => {
      if (o.name && o.name.includes('CarPaint')) {
        o.traverse((c) => { if (c.isMesh) meshes.push(c); });
      }
      o.children.forEach(find);
    };
    find(root);
    // 若节点名定位失败，回退到材质名
    if (meshes.length === 0) {
      root.traverse((o) => {
        if (o.isMesh) {
          const m = o.material;
          if (Array.isArray(m)) m.forEach((x) => { if (x && x.name && x.name.includes('CarPaint')) meshes.push(o); });
          else if (m && m.name && m.name.includes('CarPaint')) meshes.push(o);
        }
      });
    }
    // 记录原始颜色
    this.paintMeshes = meshes;
    if (meshes.length) {
      const mat = this.firstMat(meshes[0]);
      if (mat && mat.color) this.paintBaseColor = mat.color.getHex();
    }
  }

  collectWheelMeshes(root) {
    const meshes = [];
    const seen = new Set();
    root.traverse((o) => {
      // 轮毂父节点名含 Wheel hub（mesh 节点在压缩后为 Object_N）
      if (o.name && /Wheel[_\s]?hub/i.test(o.name)) {
        o.traverse((c) => {
          if (c.isMesh && !seen.has(c.uuid)) { seen.add(c.uuid); meshes.push(c); }
        });
      }
    });
    this.wheelMeshes = meshes;
  }

  firstMat(mesh) {
    const m = mesh.material;
    return Array.isArray(m) ? m[0] : m;
  }

  /** 设置车身颜色：克隆材质避免影响共享 */
  setPaintColor(hex) {
    this.paintMeshes.forEach((mesh) => {
      let mat = this.firstMat(mesh);
      if (!mat) return;
      if (mat.userData._paintCloned !== true) {
        const clone = mat.clone();
        clone.userData._paintCloned = true;
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((x) => x.clone());
        else mesh.material = clone;
      }
      const m = this.firstMat(mesh);
      if (m.color) m.color.setHex(hex);
    });
  }

  /** 轮毂样式 */
  setWheelStyle(style) {
    const styles = {
      silver: { color: 0xcfd6df, metalness: 0.92, roughness: 0.28 },
      black: { color: 0x15181d, metalness: 0.75, roughness: 0.35 },
      sport: { color: 0x2b3950, metalness: 0.85, roughness: 0.3 },
    };
    const s = styles[style] || styles.silver;
    let changed = 0;
    this.wheelMeshes.forEach((mesh) => {
      let mat = this.firstMat(mesh);
      if (!mat) return;
      if (mat.userData._wheelCloned !== true) {
        const clone = mat.clone();
        clone.userData._wheelCloned = true;
        if (Array.isArray(mesh.material)) mesh.material = mesh.material.map((x) => x.clone());
        else mesh.material = clone;
      }
      const m = this.firstMat(mesh);
      if (m.color) m.color.setHex(s.color);
      if ('metalness' in m) m.metalness = s.metalness;
      if ('roughness' in m) m.roughness = s.roughness;
      changed++;
    });
  }

  /** 收集车门组：为每扇门建铰链 pivot（绕铰链旋转开合） */
  collectDoorGroups(root) {
    root.updateMatrixWorld(true);
    const doorMap = {};
    root.traverse((o) => {
      if (!o.name) return;
      const m = o.name.match(/Door_(FL|FR|RL|RR)/) || (o.isMesh && o.name.match(/door_(fl|fr|rl|rr)/i));
      if (m) {
        const k = m[1].toUpperCase();
        (doorMap[k] = doorMap[k] || []).push(o);
      }
    });

    this.doorGroups = [];
    const _v = new THREE.Vector3();
    // 门部件多为几何偏置的空 group，用几何包围盒中心判断真实位置
    const partCenter = (n) => { const b = new THREE.Box3().setFromObject(n); b.getCenter(_v); return _v; };
    const makeDoor = (key, sub) => {
      let cw = 0;
      sub.forEach((n) => cw += partCenter(n).x);
      cw /= sub.length;
      const dir = cw >= 0 ? 1 : -1; // 门在车身的哪一侧（世界 x 符号）

      // 门整体几何包围盒（世界）
      const box = new THREE.Box3();
      sub.forEach((n) => { const b = new THREE.Box3().setFromObject(n); box.union(b); });

      // 铰链位置：门靠车头(+z)端的边缘，且靠车身一侧
      const hingeX = dir >= 0 ? box.min.x : box.max.x;
      const hingeY = (box.min.y + box.max.y) / 2;
      const hingeZ = box.max.z; // 车头朝 +z，铰链在每扇门前端

      // 建 pivot（铰链）到 car.group 下
      const pivot = new THREE.Group();
      pivot.name = `doorPivot_${key}_${dir >= 0 ? 'R' : 'L'}`;
      this.group.add(pivot);
      const hingeWorld = new THREE.Vector3(hingeX, hingeY, hingeZ);
      this.group.worldToLocal(hingeWorld);
      pivot.position.copy(hingeWorld);
      this.group.updateMatrixWorld(true);
      pivot.updateMatrixWorld(true);

      // 把该扇门所有 mesh reparent 到 pivot（保持世界位置，避免偏置几何漂移）
      const meshes = [];
      sub.forEach((n) => n.traverse((c) => { if (c.isMesh) meshes.push(c); }));
      meshes.forEach((m) => pivot.attach(m));

      this.doorGroups.push({ key, dir, pivot, meshes });
    };
    for (const key of ['FL', 'FR', 'RL', 'RR']) {
      const nodes = doorMap[key];
      if (!nodes || !nodes.length) continue;
      // 按几何中心 x 符号聚类：同侧门部件归一扇门（RL/FR 组可能含左右两扇，需拆开）
      const pos = [], neg = [];
      nodes.forEach((n) => { partCenter(n).x >= 0 ? pos.push(n) : neg.push(n); });
      const subs = [pos, neg].filter((s) => s.length);
      subs.forEach((s) => makeDoor(key, s));
    }
    // 开门旋转角（弧度，约 46°）
    this.doorOpenAngle = 0.8;
  }

  /** 车门：平滑旋转 pivot 开/关（不依赖动画轨道） */
  openDoors() {
    this.doorOpen = true;
    if (this.doorProgress < 1) this.doorProgress = Math.max(this.doorProgress, 0.001);
  }
  closeDoors() {
    this.doorOpen = false;
  }

  /** 获取某部件的世界坐标（用于热点，用包围盒中心） */
  getPartWorldPos(key) {
    const node = this.parts[key];
    if (!node) return null;
    const box = new THREE.Box3().setFromObject(node);
    const center = new THREE.Vector3();
    box.getCenter(center);
    return center;
  }

  /** 更新：平滑旋转车门（绕铰链 pivot） */
  update(delta) {
    if (this.doorGroups && this.doorGroups.length) {
      const step = delta / 0.9; // 约 0.9s 完成
      if (this.doorOpen) this.doorProgress = Math.min(1, this.doorProgress + step);
      else this.doorProgress = Math.max(0, this.doorProgress - step);
      const p = this.doorProgress;
      for (const g of this.doorGroups) {
        // 门向车身外侧旋转打开；dir 决定旋转方向（+x 侧负角、-x 侧正角）
        g.pivot.rotation.y = -g.dir * this.doorOpenAngle * p;
      }
    }
    if (this.mixer) this.mixer.update(delta);
  }
}
