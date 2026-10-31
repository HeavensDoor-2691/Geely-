import * as THREE from 'three';

/**
 * 展厅空间构建：地面、展示台、灯光氛围、品牌视觉元素
 * 返回车辆放置位置
 */
export function buildHall(scene, envMap) {
  // 环境反射（PBR 用）
  scene.environment = envMap;

  // —— 地面 ——
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0a1019,
    roughness: 0.9,
    metalness: 0.15,
  });
  const floor = new THREE.Mesh(new THREE.CircleGeometry(46, 96), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  floor.receiveShadow = true;
  scene.add(floor);

  // 地面细网格引导线（径向光晕）
  const grid = new THREE.GridHelper(90, 60, 0x1e6fff, 0x123057);
  grid.position.y = 0.002;
  grid.material.opacity = 0.22;
  grid.material.transparent = true;
  scene.add(grid);

  // —— 展示台 ——
  const podiumGroup = new THREE.Group();
  const stageMat = new THREE.MeshStandardMaterial({
    color: 0x141c2a,
    roughness: 0.35,
    metalness: 0.6,
  });
  // 台体
  const base = new THREE.Mesh(new THREE.CylinderGeometry(4.0, 4.5, 0.35, 64), stageMat);
  base.position.y = 0.175;
  base.receiveShadow = true;
  base.castShadow = true;
  podiumGroup.add(base);
  // 台面
  const top = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.06, 64), new THREE.MeshStandardMaterial({
    color: 0x0d1522, roughness: 0.25, metalness: 0.85,
  }));
  top.position.y = 0.36;
  top.receiveShadow = true;
  podiumGroup.add(top);
  // 台沿发光环
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(4.42, 4.62, 96),
    new THREE.MeshBasicMaterial({ color: 0x1e6fff, transparent: true, opacity: 0.55, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.4;
  podiumGroup.add(ring);
  scene.add(podiumGroup);

  // 展台周围地面光带
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(6.2, 6.5, 96),
    new THREE.MeshBasicMaterial({ color: 0x2f6fe4, transparent: true, opacity: 0.18, side: THREE.DoubleSide })
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.005;
  scene.add(halo);

  // —— 灯光 ——
  scene.add(new THREE.AmbientLight(0x6b7f9a, 0.95));

  // 顶部主聚光
  const spot = new THREE.SpotLight(0xffffff, 480, 46, Math.PI / 5, 0.5, 1.6);
  spot.position.set(0, 12, 6);
  spot.target.position.set(0, 0, 0);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  scene.add(spot);
  scene.add(spot.target);

  // 环场蓝色氛围灯（4 点）
  const accents = [
    [9, 4, 0], [-9, 4, 0], [0, 4, 9], [0, 4, -9],
  ];
  accents.forEach(([x, y, z], i) => {
    const c = new THREE.PointLight(0x1e6fff, 95, 24, 2);
    c.position.set(x, y, z);
    scene.add(c);
    // 灯柱
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 3.2, 12),
      new THREE.MeshStandardMaterial({ color: 0x0c1420, metalness: 0.7, roughness: 0.4 })
    );
    post.position.set(x, 1.5, z);
    scene.add(post);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x2f6fe4 })
    );
    head.position.set(x, 3.3, z);
    scene.add(head);
  });

  // 顶部补光（让车漆更亮）
  const fill = new THREE.DirectionalLight(0xcfdfff, 0.95);
  fill.position.set(-6, 9, -4);
  scene.add(fill);

  // 暖色侧光（营造层次）
  const warm = new THREE.DirectionalLight(0xffdcae, 0.55);
  warm.position.set(5, 3, 8);
  scene.add(warm);

  // 品牌背景板（远处）
  const boardMat = new THREE.MeshBasicMaterial({ color: 0x0a1322 });
  const board = new THREE.Mesh(new THREE.PlaneGeometry(34, 9), boardMat);
  board.position.set(0, 4.5, -24);
  scene.add(board);

  // 品牌文字（Canvas 生成 "GEELY AUTO" + 副标语）
  const brandTexture = makeBrandCanvas();
  const brandSprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: brandTexture, transparent: true, depthWrite: false })
  );
  brandSprite.scale.set(11, 3.6, 1);
  brandSprite.position.set(0, 7.2, -22.5);
  scene.add(brandSprite);

  return { carPosition: new THREE.Vector3(0, 0.42, 0) };
}

/** 用 Canvas 生成品牌发光文字纹理 */
function makeBrandCanvas() {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 300;
  const g = c.getContext('2d');
  g.clearRect(0, 0, c.width, c.height);
  // 主标题
  g.font = '700 120px "Segoe UI", "Microsoft YaHei", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const grad = g.createLinearGradient(0, 0, c.width, 0);
  grad.addColorStop(0, '#5aa8ff');
  grad.addColorStop(0.5, '#ffffff');
  grad.addColorStop(1, '#2f6fe4');
  g.shadowColor = 'rgba(30,111,255,0.9)';
  g.shadowBlur = 40;
  g.fillStyle = grad;
  g.fillText('GEELY AUTO', c.width / 2, 120);
  // 副标语
  g.shadowBlur = 0;
  g.font = '400 40px "Microsoft YaHei", sans-serif';
  g.fillStyle = 'rgba(200,220,255,0.85)';
  g.fillText('吉利控股集团 · 智能出行科技生态', c.width / 2, 215);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
