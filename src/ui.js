/**
 * UI 工具：模态框 + 品牌/参数/热点详情内容
 */

export function initUI() {
  const mask = document.getElementById('modalMask');
  const body = document.getElementById('modalBody');
  const close = document.getElementById('modalClose');

  function show(html) {
    body.innerHTML = html;
    mask.hidden = false;
  }
  function hide() { mask.hidden = true; }
  close.addEventListener('click', hide);
  mask.addEventListener('click', (e) => { if (e.target === mask) hide(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); });
  return { show, hide };
}

/** 品牌介绍 */
export function brandHTML() {
  return `
  <h2>浙江吉利控股集团</h2>
  <p>吉利控股集团（Zhejiang Geely Holding Group）始创于 1986 年，总部位于中国杭州，是一家立足中国、布局全球的汽车与科技产业集团，业务涵盖整车、动力总成、核心零部件、出行服务、低空出行与尖端科技等领域。</p>
  <p>集团连续多年上榜《财富》世界 500 强，2024 年吉利汽车集团总销量达 217.6 万辆（同比 +34%），全年营收突破 2400 亿元人民币，创历史新高。</p>
  <h3>旗下品牌矩阵</h3>
  <div class="brand-logos">
    <span class="logo-chip">吉利汽车 GEELY</span>
    <span class="logo-chip">领克 Lynk&Co</span>
    <span class="logo-chip">极氪 ZEEKR</span>
    <span class="logo-chip">几何 Geometry</span>
    <span class="logo-chip">沃尔沃 Volvo</span>
    <span class="logo-chip">极星 Polestar</span>
    <span class="logo-chip">路特斯 Lotus</span>
    <span class="logo-chip">雷达 RADAR</span>
    <span class="logo-chip">远程新能源</span>
    <span class="logo-chip">曹操出行</span>
  </div>
  <h3>全球化布局</h3>
  <p>吉利控股通过全球协同，建立了横跨中国、欧洲、东南亚等市场的研发与制造网络，是马来西亚国民汽车品牌宝腾（PROTON）的战略合作伙伴，并深度参与全球智能出行生态建设。</p>
  `;
}

/** 车型参数 */
export function specsHTML() {
  return `
  <h2>吉利缤越 COOLRAY</h2>
  <p>缤越是吉利 BMA 全球模块架构下打造的高性能 SUV，主打年轻化与驾控乐趣，在海外市场以 COOLRAY 之名销售。</p>
  <h3>基本参数</h3>
  <table class="spec-table">
    <tr><td>车身形式</td><td>5 门 5 座 SUV</td></tr>
    <tr><td>长 × 宽 × 高 (mm)</td><td>4330 × 1800 × 1609</td></tr>
    <tr><td>轴距 (mm)</td><td>2600</td></tr>
    <tr><td>最小离地间隙 (mm)</td><td>196</td></tr>
    <tr><td>发动机</td><td>1.5TD 四缸涡轮增压</td></tr>
    <tr><td>最大功率</td><td>133 kW（181 马力）</td></tr>
    <tr><td>变速箱</td><td>7 速湿式双离合 DCT</td></tr>
    <tr><td>驱动形式</td><td>前置前驱</td></tr>
    <tr><td>0-100 km/h</td><td>约 7.9 秒</td></tr>
  </table>
  <h3>核心亮点</h3>
  <p>· 双色车身 / 18 英寸多辐运动轮毂<br>
     · 环抱式运动座舱，悬浮式中控屏<br>
     · L2 级智能驾驶辅助<br>
     · 智能车机与语音交互系统</p>
  `;
}

/** 热点详情 */
export function hotspotHTML(key) {
  const map = {
    headlamp: {
      title: '星际矩阵 LED 大灯',
      desc: '缤越 COOLRAY 采用矩阵式 LED 大灯，造型锐利，兼具科技感与高辨识度。前脸融合"能量风暴"设计语言，与双色格栅相呼应。',
    },
    wheel: {
      title: '18 英寸运动轮毂',
      desc: '配备多辐双色运动轮毂与高性能轮胎，营造蓄势待发的运动姿态。可在右侧配置面板切换亮银 / 曜黑 / 运动双色三种轮毂风格。',
    },
    interior: {
      title: '环抱式运动座舱',
      desc: '采用环抱式驾驶舱设计，三辐运动方向盘、悬浮式中控屏与贯穿式出风口，材质与配色凸显年轻运动基因。点击"内饰视角"可近距离查看。',
    },
    taillamp: {
      title: '能量晶体贯穿尾灯',
      desc: '尾灯组采用贯穿式能量晶体设计，夜间点亮极具辨识度，与前大灯形成呼应，提升整车科技氛围。',
    },
    sunroof: {
      title: '全景天窗',
      desc: '配备大尺寸全景天窗，采光通透，为车内带来更开阔的驾乘视野与空间感。',
    },
    logo: {
      title: '吉利车标 · 六块宝石',
      desc: '吉利品牌标识由六块宝石蓝多边形构成，象征吉利控股集团旗下多元化品牌的聚合与协同，传递"造每个人的智能精品车"的品牌理念。',
    },
  };
  const d = map[key] || { title: '展车部件', desc: '吉利缤越 COOLRAY 的精致细节设计。' };
  return `
  <h2>${d.title}</h2>
  <p>${d.desc}</p>
  <p style="color:#5aa8ff">点击空白处关闭，或继续点击其他热点查看。</p>
  `;
}
