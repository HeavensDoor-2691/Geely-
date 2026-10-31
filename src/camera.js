import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';

/**
 * 相机系统：环绕(第三人称) / 第一人称 / 内饰视角 / 自动漫游
 */
export class CameraSystem {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.mode = 'orbit';

    // 环绕控制
    this.orbit = new OrbitControls(camera, domElement);
    this.orbit.enableDamping = true;
    this.orbit.dampingFactor = 0.08;
    this.orbit.minDistance = 2.5;
    this.orbit.maxDistance = 18;
    this.orbit.maxPolarAngle = Math.PI * 0.52;
    this.orbit.target.set(0, 1.1, 0);

    // 第一人称
    this.first = new PointerLockControls(camera, domElement);
    this.keys = { w: false, a: false, s: false, d: false, shift: false };
    this.firstSpeed = 4.2;
    this.firstHeight = 1.65;

    // 内饰视角目标：看向中控大屏 / 仪表区域（车头朝 +z）
    this.interiorCenter = new THREE.Vector3(0, 1.55, 0.65);

    // 内饰手动环绕（拖拽绕车内中心旋转）
    this.intSph = new THREE.Spherical(0.801, 1.05, 2.62);
    this._intDrag = false;
    this._intLast = null;
    this._intDown = (e) => {
      if (this.mode !== 'interior') return;
      this._intDrag = true;
      this._intLast = { x: e.clientX, y: e.clientY };
    };
    this._intMove = (e) => {
      if (this.mode !== 'interior' || !this._intDrag || !this._intLast) return;
      const dx = e.clientX - this._intLast.x, dy = e.clientY - this._intLast.y;
      this._intLast = { x: e.clientX, y: e.clientY };
      this.intSph.theta -= dx * 0.006;
      this.intSph.phi = Math.max(0.25, Math.min(Math.PI * 0.92, this.intSph.phi - dy * 0.006));
    };
    this._intUp = () => { this._intDrag = false; this._intLast = null; };
    domElement.addEventListener('pointerdown', this._intDown);
    window.addEventListener('pointermove', this._intMove);
    window.addEventListener('pointerup', this._intUp);

    // 漫游
    this.tourIndex = 0;
    this.tourTime = 0;

    // 平滑插值
    this.lerpPos = new THREE.Vector3();
    this.lerpLook = new THREE.Vector3();

    this.bindKeys();
    // 触发射线，供 first 模式外部锁定
    this.onLockRequest = null;
  }

  bindKeys() {
    const set = (e, v) => {
      const k = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'shift'].includes(k)) { this.keys[k] = v; e.preventDefault(); }
    };
    window.addEventListener('keydown', (e) => set(e, true));
    window.addEventListener('keyup', (e) => set(e, false));
  }

  setTarget(x, y, z) {
    this.orbit.target.set(x, y, z);
  }

  /** 切换模式 */
  switchMode(mode, opts = {}) {
    this.mode = mode;
    // 先停用所有
    this.orbit.enabled = false;
    if (this.first.isLocked) this.first.unlock();
    this.firstSpeed = opts.speed || 4.2;

    if (mode === 'orbit') {
      this.orbit.enabled = true;
      this.orbit.update();
    } else if (mode === 'first') {
      this.firstSpeed = opts.speed || 4.2;
      if (this.onLockRequest) this.onLockRequest();
    } else if (mode === 'interior') {
      // 相机位于第一排座椅（坐姿眼高），可拖拽环绕查看车内
      this.orbit.enabled = false;
      this.camera.position.set(0, 1.65, -0.05);
      this.camera.lookAt(this.interiorCenter);
      const off = new THREE.Vector3().subVectors(this.camera.position, this.interiorCenter);
      this.intSph.setFromVector3(off);
    } else if (mode === 'tour') {
      this.tourIndex = 0;
      this.tourTime = 0;
    }
  }

  /** 漫游路径 */
  get tourPoints() {
    return [
      { pos: new THREE.Vector3(6.2, 1.7, 4.6), look: new THREE.Vector3(0, 0.9, 0) },
      { pos: new THREE.Vector3(-6.2, 1.6, 4.2), look: new THREE.Vector3(0, 0.9, 0) },
      { pos: new THREE.Vector3(-5.6, 1.9, -4.4), look: new THREE.Vector3(0, 0.8, 0) },
      { pos: new THREE.Vector3(5.6, 1.8, -4.0), look: new THREE.Vector3(0, 0.8, 0) },
      { pos: new THREE.Vector3(0.2, 1.3, 7.6), look: new THREE.Vector3(0, 0.9, 0) },
      { pos: new THREE.Vector3(0, 1.6, -7.2), look: new THREE.Vector3(0, 1.0, 0) },
    ];
  }

  /** 主更新循环 */
  update(delta) {
    if (this.mode === 'orbit') {
      this.orbit.update();
    } else if (this.mode === 'first') {
      this.updateFirst(delta);
    } else if (this.mode === 'interior') {
      // 手动环绕车内中心
      const v = new THREE.Vector3().setFromSpherical(this.intSph);
      this.camera.position.copy(this.interiorCenter).add(v);
      this.camera.lookAt(this.interiorCenter);
    } else if (this.mode === 'tour') {
      this.updateTour(delta);
    }
  }

  updateFirst(delta) {
    if (!this.first.isLocked) return;
    const k = this.keys;
    const f = (k.w ? 1 : 0) - (k.s ? 1 : 0);
    const r = (k.d ? 1 : 0) - (k.a ? 1 : 0);
    const speed = this.firstSpeed * (k.shift ? 2.2 : 1);
    // 按相机实际朝向移动：W 向前、S 向后、A 左、D 右
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).normalize();
    this.camera.position.addScaledVector(forward, f * speed * delta);
    this.camera.position.addScaledVector(right, r * speed * delta);
    this.camera.position.y = this.firstHeight;

    // 边界约束：展台禁入 + 展厅边界
    const x = this.camera.position.x, z = this.camera.position.z;
    const dist = Math.hypot(x, z);
    if (dist < 5.6) {
      const ang = Math.atan2(x, z);
      this.camera.position.x = Math.sin(ang) * 5.6;
      this.camera.position.z = Math.cos(ang) * 5.6;
    }
    if (dist > 40) {
      const ang = Math.atan2(x, z);
      this.camera.position.x = Math.sin(ang) * 40;
      this.camera.position.z = Math.cos(ang) * 40;
    }
  }

  updateTour(delta) {
    const pts = this.tourPoints;
    this.tourTime += delta * 0.32; // 每段时长
    if (this.tourTime >= 1) {
      this.tourTime = 0;
      this.tourIndex = (this.tourIndex + 1) % pts.length;
    }
    const a = pts[this.tourIndex];
    const b = pts[(this.tourIndex + 1) % pts.length];
    const t = this.smoothstep(this.tourTime);
    // 插值位置与看向目标
    const pos = new THREE.Vector3().lerpVectors(a.pos, b.pos, t);
    const look = new THREE.Vector3().lerpVectors(a.look, b.look, t);
    // 平滑跟随（避免跳变）
    if (this.lerpPos.length() === 0) { this.lerpPos.copy(pos); this.lerpLook.copy(look); }
    this.lerpPos.lerp(pos, 0.12);
    this.lerpLook.lerp(look, 0.12);
    this.camera.position.copy(this.lerpPos);
    this.camera.lookAt(this.lerpLook);
  }

  smoothstep(x) { return x * x * (3 - 2 * x); }

  /** 重置到默认环绕视角 */
  reset() {
    this.switchMode('orbit');
    this.orbit.target.set(0, 1.1, 0);
    this.camera.position.set(5.2, 2.4, 5.8);
    this.orbit.update();
  }

  /** 初始摆放 */
  init() {
    this.reset();
  }
}
