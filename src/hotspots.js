import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * 展车热点标注（CSS2D）
 */
export class HotspotsManager {
  constructor(scene) {
    this.scene = scene;
    this.cssRenderer = new CSS2DRenderer();
    this.cssRenderer.domElement.style.position = 'absolute';
    this.cssRenderer.domElement.style.top = '0';
    this.cssRenderer.domElement.style.left = '0';
    this.cssRenderer.domElement.style.pointerEvents = 'none';
    this.cssRenderer.domElement.classList.add('hotspots-layer');
    document.getElementById('app').appendChild(this.cssRenderer.domElement);
    this.items = [];
  }

  setSize(w, h) { this.cssRenderer.setSize(w, h); }

  /** 添加一个热点 */
  add(key, label, index, position, onClick) {
    const div = document.createElement('div');
    div.className = 'hotspot';
    div.innerHTML = `<span class="dot">${index}</span><span class="label">${label}</span>`;
    const obj = new CSS2DObject(div);
    obj.position.copy(position);
    this.scene.add(obj);

    // 点击（放大点，便于命中）
    div.style.pointerEvents = 'auto';
    div.addEventListener('click', (e) => { e.stopPropagation(); onClick(key); });

    this.items.push({ key, obj, div });
    return obj;
  }

  render(camera) { this.cssRenderer.render(this.scene, camera); }

  /** 根据部件名生成热点（位置来自 carManager） */
  buildFromParts(car, onClick) {
    const defs = [
      { key: 'headlamp', part: 'HeadLamp', label: 'LED 大灯' },
      { key: 'wheel', part: 'Wheel hub', label: '运动轮毂' },
      { key: 'interior', part: 'Inner top', label: '运动座舱' },
      { key: 'taillamp', part: 'Rear Tail Light', label: '贯穿尾灯' },
      { key: 'sunroof', part: 'SunRoof', label: '全景天窗' },
      { key: 'logo', part: 'Rear Logo', label: '吉利车标' },
    ];
    let idx = 1;
    const used = new Set();
    for (const d of defs) {
      let pos = car.getPartWorldPos(d.part);
      if (!pos) continue;
      // 轮毂有4个，只取右侧前轮；天窗取顶部（抬高）
      if (d.part === 'SunRoof') pos = pos.clone().add(new THREE.Vector3(0, 0.25, 0));
      this.add(d.key, d.label, idx++, pos, onClick);
      used.add(d.key);
    }
    return [...used];
  }
}
