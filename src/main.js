import * as THREE from 'three';
import { buildHall } from './hall.js';
import { CarManager } from './car.js';
import { CameraSystem } from './camera.js';
import { HotspotsManager } from './hotspots.js';
import { initUI, brandHTML, specsHTML, hotspotHTML } from './ui.js';
import './style.css';

// —— 资源（Vite ?url 保证 build 后路径正确）——
import modelUrl from './model/Geely.glb?url';
import texPx from './textures_opt/px.webp?url';
import texNx from './textures_opt/nx.webp?url';
import texPy from './textures_opt/py.webp?url';
import texNy from './textures_opt/ny.webp?url';
import texPz from './textures_opt/pz.webp?url';
import texNz from './textures_opt/nz.webp?url';

// —— 场景 ——
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b12);
scene.fog = new THREE.Fog(0x070b12, 30, 90);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.getElementById('app').appendChild(renderer.domElement);

// 环境贴图（反射）
const envMap = new THREE.CubeTextureLoader().load([texPx, texNx, texPy, texNy, texPz, texNz]);
envMap.colorSpace = THREE.SRGBColorSpace;
scene.environment = envMap;

// —— 展厅空间 ——
const hall = buildHall(scene, envMap);

// —— 相机系统 ——
const camSystem = new CameraSystem(camera, renderer.domElement);
camSystem.init();

// —— UI ——
const ui = initUI();
const app = document.getElementById('app');

// 第一人称提示层
const pointerHint = document.createElement('div');
pointerHint.id = 'pointer-hint';
pointerHint.innerHTML = '点击屏幕进入第一人称漫游<br><span style="font-size:13px;opacity:.7">WASD 移动 · 鼠标转向 · Esc 退出</span>';
app.appendChild(pointerHint);
camSystem.onLockRequest = () => {
  pointerHint.classList.add('show');
  const once = () => {
    camSystem.first.lock();
  };
  app.addEventListener('click', once, { once: true });
};
document.addEventListener('pointerlockchange', () => {
  pointerHint.classList.remove('show');
});

// —— 展车 ——
const car = new CarManager(scene);
let hotspots = null;
const loadingFill = document.getElementById('loadingFill');
const loadingText = document.getElementById('loadingText');

car.load(modelUrl, (evt) => {
  if (evt.total) {
    const pct = Math.round((evt.loaded / evt.total) * 100);
    loadingFill.style.width = pct + '%';
    loadingText.textContent = `正在加载展车模型 ${pct}%`;
  }
}).then(() => {
  // 归一化尺寸：车长约 4.6 单位，居中放到展台
  const box = new THREE.Box3().setFromObject(car.group);
  const size = box.getSize(new THREE.Vector3());
  const s = 4.6 / size.z;
  car.group.scale.setScalar(s);
  box.setFromObject(car.group);
  const center = box.getCenter(new THREE.Vector3());
  car.group.position.set(-center.x, -box.min.y + hall.carPosition.y, -center.z);

  // 热点
  hotspots = new HotspotsManager(scene);
  hotspots.setSize(window.innerWidth, window.innerHeight);
  hotspots.buildFromParts(car, (key) => ui.show(hotspotHTML(key)));

  // 应用当前激活的车身颜色，保持配置面板一致
  const activeSwatch = document.querySelector('#paintSwatches .swatch.active');
  if (activeSwatch) car.setPaintColor(parseInt(activeSwatch.dataset.color.slice(1), 16));

  // 隐藏加载屏
  const loading = document.getElementById('loading');
  loading.classList.add('hidden');
  setTimeout(() => { if (loading.parentNode) loading.parentNode.removeChild(loading); }, 700);
  updateViewButtons();
}).catch((err) => {
  console.error('模型加载失败', err);
  loadingText.textContent = '模型加载失败，请刷新重试';
});

// —— 视角切换 ——
const viewBtns = document.querySelectorAll('#view-controls .vc-btn');
function updateViewButtons() {
  viewBtns.forEach((b) => b.classList.toggle('active', b.dataset.view === camSystem.mode));
}
viewBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.view;
    if (mode === 'orbit') camSystem.switchMode('orbit');
    else if (mode === 'first') camSystem.switchMode('first');
    else if (mode === 'interior') camSystem.switchMode('interior');
    else if (mode === 'tour') camSystem.switchMode('tour');
    updateViewButtons();
  });
});

// —— 配置面板 ——
const paintSwatches = document.querySelectorAll('#paintSwatches .swatch');
paintSwatches.forEach((sw) => {
  sw.addEventListener('click', () => {
    paintSwatches.forEach((x) => x.classList.remove('active'));
    sw.classList.add('active');
    car.setPaintColor(parseInt(sw.dataset.color.slice(1), 16));
  });
});
// 默认高亮紫曜灰
document.querySelector('#paintSwatches .swatch[data-color="#6b6276"]').classList.add('active');

const wheelBtns = document.querySelectorAll('#wheelSeg .seg-btn');
wheelBtns.forEach((b) => {
  b.addEventListener('click', () => {
    wheelBtns.forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    car.setWheelStyle(b.dataset.wheel);
  });
});
document.querySelector('#wheelSeg .seg-btn[data-wheel="silver"]').classList.add('active');

const doorBtns = document.querySelectorAll('#doorSeg .seg-btn');
doorBtns.forEach((b) => {
  b.addEventListener('click', () => {
    doorBtns.forEach((x) => x.classList.remove('active'));
    b.classList.add('active');
    if (b.dataset.door === 'open') car.openDoors();
    else car.closeDoors();
  });
});

// 面板收起
document.getElementById('cpClose').addEventListener('click', () => {
  document.getElementById('config-panel').classList.toggle('collapsed');
});

// —— 顶部导航 ——
document.querySelectorAll('.top-nav .nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const a = btn.dataset.action;
    if (a === 'brand') ui.show(brandHTML());
    else if (a === 'specs') ui.show(specsHTML());
    else if (a === 'reset') camSystem.reset();
  });
});

// —— 窗口自适应 ——
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (hotspots) hotspots.setSize(window.innerWidth, window.innerHeight);
});
if (hotspots) hotspots.setSize(window.innerWidth, window.innerHeight);

// —— 渲染循环 ——
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.05);
  camSystem.update(delta);
  car.update(delta);
  if (hotspots) hotspots.render(camera);
  renderer.render(scene, camera);
}
animate();
