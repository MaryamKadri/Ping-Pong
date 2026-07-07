import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildPaddle } from './scene/Paddle.js';
import { PaddleBot, AutoServeController } from './physics/PaddleBot.js';
import { MatchStartOverlay } from './ui/MatchStartOverlay.js';

import { PHYSICS } from './constants.js';
import { BallState } from './physics/BallState.js';
import { PhysicsEngine } from './physics/PhysicsEngine.js';
import { TrajectoryVisualizer } from './utils/TrajectoryVisualizer.js';
import { buildLights } from './scene/Lights.js';
import { buildFloor } from './scene/Floor.js';
import { buildTable } from './scene/Table.js';
import { Water } from 'three/addons/objects/Water.js';
import { buildBeachFurniture } from './scene/BeachFurniture.js';
import { buildPalmTrees } from './scene/PalmTrees.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js'; // 🆕 إضافة مستعرض اللوحات الثنائية

// ════════════════════════════════════════════════════════════════
//  Renderer
// ════════════════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  logarithmicDepthBuffer: true
});
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.6;

// ════════════════════════════════════════════════════════════════
// 🆕 CSS2D Renderer (لوحة النتائج الرقمية)
// ════════════════════════════════════════════════════════════════
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(container.clientWidth, container.clientHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0px';
labelRenderer.domElement.style.pointerEvents = 'none'; // لمنع حجب تحكم الماوس (OrbitControls)
container.appendChild(labelRenderer.domElement);

container.appendChild(renderer.domElement);

// ════════════════════════════════════════════════════════════════
//  Scene & Camera
// ════════════════════════════════════════════════════════════════
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e); // لون خلفية آمن

const camera = new THREE.PerspectiveCamera(
  50,
  container.clientWidth / container.clientHeight,
  0.5,
  500000
);
camera.position.set(-11, 6, 9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, PHYSICS.tableH, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 1;
controls.maxDistance = 35;
controls.maxPolarAngle = Math.PI / 2 - 0.02;

// ════════════════════════════════════════════════════════════════
//  Environment
// ════════════════════════════════════════════════════════════════
try {
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load('/kloofendal_48d_partly_cloudy_puresky_2k.hdr', (texture) => {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
  });
} catch(e) {
  console.log('Sky loading failed, using default background');
}

const lights = buildLights(scene);
buildFloor(scene);
buildTable(scene);
buildBeachFurniture(scene);
buildPalmTrees(scene);


// ════════════════════════════════════════════════════════════════
// 🌊 بناء البحر والأمواج (تم إعادته من الكود القديم الزابط)
// ════════════════════════════════════════════════════════════════
// 1. تحديد موقع الشمس لعمل لمعان واقعي فوق الأمواج
const sun = new THREE.Vector3();
const elevation = 1.5; 
const azimuth = 90; 
const phi = THREE.MathUtils.degToRad(90 - elevation);
const thetaSun = THREE.MathUtils.degToRad(azimuth);
sun.setFromSphericalCoords(1, phi, thetaSun);

// 2. إنشاء هندسة وأبعاد البحر
const waterGeometry = new THREE.PlaneGeometry(50000, 50000);

// 3. إعداد كائن المياه المتطور مع خريطة التعرجات الحركية
const water = new Water(
  waterGeometry,
  {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('https://threejs.org/examples/textures/waternormals.jpg', function (texture) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    }),
    sunDirection: sun.clone().normalize(), 
    sunColor: 0xfff0d0,
    waterColor: 0x001e1a, 
    distortionScale: 4.0, 
    fog: scene.fog !== undefined
  }
);

water.rotation.x = -Math.PI / 2;
water.position.y = -0.45; // يرتفع فوق الرمل (-1.2) وينزل تحت المنصة الخشبية (0.0) ليظهر بشكل مثالي
water.position.x = 5 + 25000; 
water.position.z = 0;

// 🔥 إعطاء اسم مميز ليمسك به كود التحريك
water.name = 'sea_water'; 

scene.add(water);

// ════════════════════════════════════════════════════════════════
//  Ball
// ════════════════════════════════════════════════════════════════
let currentRadius = PHYSICS.r;

const ballGeo = new THREE.SphereGeometry(1, 32, 32);
const ballMat = new THREE.MeshStandardMaterial({ color: 0xfafafa, roughness: 0.3 });
const ballMesh = new THREE.Mesh(ballGeo, ballMat);
ballMesh.castShadow = true;
ballMesh.scale.setScalar(PHYSICS.r);
scene.add(ballMesh);

const blobMesh = new THREE.Mesh(
  new THREE.CircleGeometry(PHYSICS.r * 1.5, 16),
  new THREE.MeshBasicMaterial({ color: 0x000000, opacity: 0.35, transparent: true })
);
blobMesh.rotation.x = -Math.PI / 2;
scene.add(blobMesh);

// ════════════════════════════════════════════════════════════════
//  Paddles
// ════════════════════════════════════════════════════════════════
const playerPaddle = buildPaddle(0xd64545);
const botPaddle = buildPaddle(0x3478c2);
scene.add(playerPaddle);
scene.add(botPaddle);

const paddleBotLeft = new PaddleBot('left', PHYSICS.tableL / 2);
const paddleBotRight = new PaddleBot('right', PHYSICS.tableL / 2);
const autoServeController = new AutoServeController();

// ════════════════════════════════════════════════════════════════
//  Physics
// ════════════════════════════════════════════════════════════════
const ballState = new BallState();
const physics = new PhysicsEngine(ballState);
const trajectory = new TrajectoryVisualizer(scene);

let spinType = 'topspin';
const fixedVelocityTypes = ['topspin', 'backspin', 'sidespin'];

// ════════════════════════════════════════════════════════════════
//  Match State
// ════════════════════════════════════════════════════════════════
let isMatchActive = false; // 🆕 renamed from matchStarted — now ONLY gates bot AI, collision, and autoserve. Physics/rendering never depend on this.
let currentServerSide = 'left';
let rallyCount = 0;

// ════════════════════════════════════════════════════════════════
//  UI Elements
// ════════════════════════════════════════════════════════════════
const stopMatchBtn = document.getElementById('btn-stop-match');
const spinSelect = document.getElementById('spinSelect');
const ballSizeSlider = document.getElementById('ball-size');
const v0Slider = document.getElementById('v0');
const thetaSlider = document.getElementById('theta');
const omegaSlider = document.getElementById('omegaSlider');

// ════════════════════════════════════════════════════════════════
//  UI Functions
// ════════════════════════════════════════════════════════════════
function setMatchUI(running) {
  if (stopMatchBtn) {
    stopMatchBtn.classList.toggle('running', running);
    stopMatchBtn.classList.toggle('stopped', !running);
  }
}

function startMatch() {
  isMatchActive = true;
  setMatchUI(true);
  currentServerSide = 'left';
  autoServe(currentServerSide);
}

function stopMatch() {
  isMatchActive = false;
  setMatchUI(false);

  ballState.vel.set(0, 0, 0);
  ballState.omega.set(0, 0, 0);
  ballState.stopped = true;

  rallyCount = 0; // السطر القديم
  scoreLeft = 0;  // السطر القديم
  scoreRight = 0; // السطر القديم
  updateScoreboardUI(); // 🆕 أضيفي هذا السطر هنا لإعادة اللوحة إلى الصفر الإبتدائي

  [paddleBotLeft, paddleBotRight].forEach(bot => {
    bot.pos.set(bot.restX, bot.baseY, 0);
    bot.currentVel.set(0, 0, 0);
    bot.lunging = false;
    bot.swinging = false;
    bot.swingTimer = 0;
    bot.pitch = 0;
    bot.roll = 0;
    bot.bouncedOnMySide = false;
  });
}

// 🆕 The actual fix: the button now toggles between the two states instead
// of only ever calling stopMatch(). Previously, once a match was stopped
// there was no code path back to isMatchActive = true except the one-time
// MatchStartOverlay — so the match looked permanently frozen even though
// requestAnimationFrame itself was running fine the whole time.
function toggleMatch() {
  if (isMatchActive) {
    stopMatch();
  } else {
    startMatch();
  }
}

function getLaunchParams() {
  const v0 = v0Slider ? parseFloat(v0Slider.value) : 7;
  const thetaDeg = thetaSlider ? parseFloat(thetaSlider.value) : 15;
  const theta = thetaDeg * Math.PI / 180;
  return { v0, theta };
}
function autoServe(side) {
  const serverBot = side === 'left' ? paddleBotLeft : paddleBotRight;
  const dirSign = side === 'left' ? 1 : -1;

  paddleBotLeft.onServe();
  paddleBotRight.onServe();
  physics.justLaunched = false;

  const { v0, theta } = getLaunchParams();
  const spinTypeValue = spinSelect ? spinSelect.value : 'topspin';

  // 🆕 Ball now spawns at the paddle FACE center, not the handle base.
  // Derived directly from Paddle.js's geometry: the face's local Y offset
  // from the group origin (handle bottom) is handleLength + paddleRadius
  // = 0.38 + 0.35 = 0.73. Previously this was a flat "+0.02", which put
  // the ball at the handle's base height instead of the hitting surface.
  const PADDLE_FACE_OFFSET_Y = 0.73;

  ballState.pos.set(
    serverBot.pos.x - dirSign * 0.08,
    serverBot.pos.y + PADDLE_FACE_OFFSET_Y,
    serverBot.pos.z
  );

  ballState.vel.set(0, 0, 0);
  ballState.omega.set(0, 0, 0);
  ballState.bounces = 0;
  ballState.stopped = false;

  const vx = dirSign * v0 * Math.cos(theta);
  const vy = v0 * Math.sin(theta);
  const vz = 0;

  ballState.vel.set(vx, vy, vz);

  const omegaMag = omegaSlider ? parseFloat(omegaSlider.value) : 0;
  switch (spinTypeValue) {
    case 'topspin':
      ballState.omega.set(0, 0, -(omegaMag || 3));
      break;
    case 'backspin':
      ballState.omega.set(0, 0, omegaMag || 3);
      break;
    case 'sidespin':
      ballState.omega.set(0, (omegaMag || 6), 0);
      break;
    default:
      ballState.omega.set(0, 0, 0);
  }

  physics.currentType = spinTypeValue;
  physics.justLaunched = true;
  rallyCount = 0;
  updateScoreboardUI();
  trajectory.clear();
}

function getNextServer() {
  currentServerSide = currentServerSide === 'left' ? 'right' : 'left';
  return currentServerSide;
}
// 🆕 Named, tunable probabilities — adjust these three numbers directly
// to rebalance how often each scenario occurs. They must sum to 1.0.
const SCENARIO_WEIGHTS = {
  RALLY: 0.78,        // Scenario A — clean return, rally continues
  NET_FAULT: 0.12,    // Scenario B — mistimed, ball can't clear the net
  OUT_OF_BOUNDS: 0.10 // Scenario C — overhit, goes long/out
};

function applyPaddleImpulse(ballState, bot) {
  bot.planShot();

  const origin = ballState.pos.clone();
  const target = bot.aimTarget.clone(); // أخذ نسخة من الهدف لتعديلها بأمان

  const roll = Math.random();
  let scenario;
  
  // 🆕 تعديل الاحتمالات: رفع نسبة الـ RALLY ليكون التبادل مستمراً وممتعاً
  if (roll < 0.90) { 
    scenario = 'RALLY'; // 90% من الضربات ستكون تبادل نظيف وناجح
  } else if (roll < 0.96) {
    scenario = 'NET_FAULT'; // 6% فقط تضرب بالشبك
  } else {
    scenario = 'OUT_OF_BOUNDS'; // 4% تخرج خارج الطاولة
  }

  switch (scenario) {
    case 'NET_FAULT':
      // تقصير الهدف جداً ليصبح قريباً من الشبك فلا تعبر الكرة
      target.x *= 0.15;
      break;

    case 'OUT_OF_BOUNDS':
      // دفع الكرة لتخرج خلف حدود الطاولة
      {
        const sign = Math.sign(target.x) || (bot.side === 'left' ? 1 : -1);
        target.x = sign * (bot.tableHalfX + THREE.MathUtils.randFloat(0.4, 0.9));
      }
      break;

    case 'RALLY':
    default:
      // ضربة نظيفة تعبر الشبكة وتضمن استمرار الماتش
      // إضافة بعض العشوائية الذكية في الزوايا لتنويع الضربات
      if (Math.random() < 0.40) {
        const cornerBias = Math.sign(target.z) || (Math.random() < 0.5 ? 1 : -1);
        target.z = cornerBias * THREE.MathUtils.randFloat(PHYSICS.tableW * 0.25, PHYSICS.tableW * 0.45);
      }
      break;
  }

  const dx = target.x - origin.x;
  const dz = target.z - origin.z;

  // 🆕 ضبط زمن الطيران ليكون متناسباً مع سيناريو الـ RALLY لجعل الضربة واقعية وقوية
  const flightTime = scenario === 'RALLY' ? THREE.MathUtils.randFloat(0.45, 0.6) : THREE.MathUtils.randFloat(0.6, 0.8);
  let vx = dx / flightTime;
  let vz = dz / flightTime;

  const GRAVITY = 9.8;
  const tableSurfaceY = PHYSICS.tableH + PHYSICS.tableThickness;
  const netHeightAboveTable = PHYSICS.netHeight ?? 0.15;
  
  // 🆕 زيادة هامش الأمان الفوق الشبك (CLEARANCE_MARGIN) عند الـ RALLY لتأكيد عبور الكرة بأمان
  const CLEARANCE_MARGIN = scenario === 'RALLY' ? 0.15 : 0.02;
  const netTopY = tableSurfaceY + netHeightAboveTable + CLEARANCE_MARGIN;

  let tNet = Math.abs(vx) > 0.001 ? (0 - origin.x) / vx : flightTime * 0.5;
  tNet = THREE.MathUtils.clamp(tNet, 0.05, flightTime - 0.05);

  // حساب السرعة الرأسية vy المطلوبة لعبور الشبك تماماً
  let vy = ((netTopY - origin.y) + 0.5 * GRAVITY * tNet * tNet) / tNet;
  
  // 🆕 رفع الحد الأدنى للسرعة العمودية لمنع الكرة من السقوط المباشر في الشبك
  vy = THREE.MathUtils.clamp(vy, 3.0, 6.5);

  // إضافة اهتزاز فيزيائي (Jitter) طفيف جداً لحفظ الواقعية دون إفساد مسار الكرة
  const jitter = (mag) => THREE.MathUtils.randFloatSpread(mag);
  if (scenario === 'RALLY') {
    vx += jitter(0.2);
    vz += jitter(0.2);
    vy += jitter(0.1);
  } else {
    vx += jitter(0.5);
    vz += jitter(0.5);
    vy += jitter(0.2);
  }

  // دمج سرعة المضرب الحالية مع سرعة الكرة لإعطاء تأثير حركي ممتاز
  vx += bot.vel.x * 0.15;
  vz += bot.vel.z * 0.15;

  const finalVel = new THREE.Vector3(vx, vy, vz);
  
  // 🆕 ضبط حدود السرعة الكلية لتتناسب مع أبعاد الطاولة وسلاسة الردود
  const speed = THREE.MathUtils.clamp(finalVel.length(), 5.5, 12.0);
  finalVel.setLength(speed);
  
  // تأكيد بقاء السرعة الرأسية كافية للارتفاع والتخطي
  finalVel.y = Math.max(finalVel.y, 2.5);

  ballState.vel.copy(finalVel);

  // حساب الدوران (Spin) بناءً على حركة المضرب
  const spinTopBack = THREE.MathUtils.clamp(-bot.pitch * 6 + jitter(1.5), -8, 8);
  const spinSide = THREE.MathUtils.clamp(bot.roll * 6 + jitter(1.0), -8, 8);
  ballState.omega.set(0, spinSide, spinTopBack);

  const sideSign = bot.side === 'left' ? 1 : -1;
  const powerFactor = THREE.MathUtils.clamp(speed / 12.0, 0.3, 1);
  return {
    pitchAmp: sideSign * THREE.MathUtils.lerp(0.3, 0.75, powerFactor),
    rollAmp: bot.roll * 0.8
  };
}

// ════════════════════════════════════════════════════════════════
//  Event Listeners
// ════════════════════════════════════════════════════════════════
stopMatchBtn?.addEventListener('click', toggleMatch);

document.getElementById('launch-btn')?.addEventListener('click', () => {
  // 🆕 Manual launch is intentionally independent of the match — it works
  // whenever a match isn't actively running, using getLaunchParams() from the sliders.
  if (!isMatchActive) {
    autoServe('right'); // تنطلق الكرة من جهة اليمين (المضرب الأحمر)

    // 🆕 تفعيل حركة أرجحة المضرب الأيمن (الاحمر) يدوياً ليتناسب مع الإطلاق الفيزيائي للكرة
    const speed = ballState.vel.length();
    const powerFactor = THREE.MathUtils.clamp(speed / 11.0, 0.3, 1);
    
    // حساب قوة ميلان المضرب (Pitch & Roll) بناءً على القيم الحالية لتظهر الضربة واقعية
    const pitchAmp = -THREE.MathUtils.lerp(0.3, 0.75, powerFactor);
    const rollAmp = paddleBotRight.roll * 0.8;

    // إرسال إشارة للمضرب الأحمر لينفذ الأرجحة فوراً
    paddleBotRight.onHit(pitchAmp, rollAmp);
  }
});

spinSelect?.addEventListener('change', (e) => {
  spinType = e.target.value;
});

ballSizeSlider?.addEventListener('input', () => {
  const scale = parseFloat(ballSizeSlider.value);
  document.getElementById('ball-size-val').textContent = scale.toFixed(1);
  currentRadius = PHYSICS.r * scale;
  ballMesh.scale.setScalar(currentRadius);
});

['v0', 'theta', 'omegaSlider'].forEach(id => {
  const input = document.getElementById(id);
  const valEl = document.getElementById(id + '-val');
  if (input && valEl) {
    input.addEventListener('input', () => {
      valEl.textContent = input.value;
    });
  }
});

// ════════════════════════════════════════════════════════════════
//  Match Start Overlay
// ════════════════════════════════════════════════════════════════
const matchStartOverlay = new MatchStartOverlay({
  onStart: () => {
    startMatch();
  },
});

setMatchUI(false);

// ════════════════════════════════════════════════════════════════
// 🆕 بناء وتصميم لوحة النتائج (Scoreboard UI)
// ════════════════════════════════════════════════════════════════
// متغيرات لتتبع النقاط الإجمالية إلى جانب الـ Rally الحالي
let scoreLeft = 0;
let scoreRight = 0;

// 1. إنشاء عنصر الـ HTML وتصميمه بـ CSS
const scoreDiv = document.createElement('div');
scoreDiv.className = 'scoreboard-container';
scoreDiv.innerHTML = `
  <div style="display: flex; flex-direction: column; align-items: center; font-family: 'Segoe UI', sans-serif; background: rgba(15, 15, 25, 0.9); color: white; padding: 6px 14px; border-radius: 8px; border: 1.5px solid #3478c2; box-shadow: 0 0 10px rgba(52, 120, 194, 0.4); min-width: 150px; text-align: center; transform: scale(0.85); user-select: none;">
    <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: #a0aec0; margin-bottom: 2px;">Scoreboard</div>
    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 2px;">
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 9px; color: #3478c2; font-weight: bold;">BLUE</div>
        <div id="score-left-val" style="font-size: 22px; font-weight: bold; font-family: monospace; line-height: 1;">0</div>
      </div>
      <div style="font-size: 12px; color: #4a5568; font-weight: bold; padding: 0 6px;">:</div>
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 9px; color: #d64545; font-weight: bold;">RED</div>
        <div id="score-right-val" style="font-size: 22px; font-weight: bold; font-family: monospace; line-height: 1;">0</div>
      </div>
    </div>
    <div style="border-top: 1px solid #2d3748; width: 100%; padding-top: 2px; margin-top: 2px; font-size: 9px; color: #00ffcc;">
      Rally: <span id="score-rally-val" style="font-weight: bold;">0</span>
    </div>
  </div>
`;

// 2. تحويل عنصر الـ HTML إلى كائن ثلاثي أبعاد CSS2DObject
const scoreboardObject = new CSS2DObject(scoreDiv);

// 3. تحديد الإحداثيات (X, Y, Z) لتطابق مكان المربع الأصفر خلف الطاولة تماماً
// الطاولة في المنتصف، لذا نضع اللوحة بعيداً على محور X الموجب، ومرتفعة على Y
// تقريب اللوحة لتصبح في المنتصف خلف الطاولة مباشرة (X = 0) ومرفوعة بشكل مريح للرؤية (Y)
scoreboardObject.position.set(0, PHYSICS.tableH + 1.6, -4.0);
scene.add(scoreboardObject);

// دالة تحديث الأرقام برمجياً في اللوحة عند كل ضربة أو تغيير في النتيجة
function updateScoreboardUI() {
  const leftEl = document.getElementById('score-left-val');
  const rightEl = document.getElementById('score-right-val');
  const rallyEl = document.getElementById('score-rally-val');
  
  if (leftEl) leftEl.textContent = scoreLeft;
  if (rightEl) rightEl.textContent = scoreRight;
  if (rallyEl) rallyEl.textContent = rallyCount;
}

function checkAndAwardPoints() {
  if (ballState.stopped) return; // إذا كانت الكرة متوقفة أصلاً لا تفعل شيء

  const tableSurfaceY = PHYSICS.tableH + PHYSICS.tableThickness;
  const outOfBoundsX = PHYSICS.tableL / 2 + 0.1; // حدود الطاولة طولياً
  const outOfBoundsZ = PHYSICS.tableW / 2 + 0.1; // حدود الطاولة عرضياً

  // 1. إذا سقطت الكرة تحت مستوى الطاولة (سقطت أرضاً أو في الشبكة ولم يضربها البوت)
  if (ballState.pos.y < tableSurfaceY - 0.1) {
    // تحديد الفائز بالنقطة بناءً على مكان الكرة واتجاه حركتها الأخير
    if (ballState.pos.x > 0) {
      // الكرة سقطت في جهة اليمين (اللاعب الأحمر أخطأ) -> النقطة للأزرق
      scoreLeft++;
    } else {
      // الكرة سقطت في جهة اليسار (اللاعب الأزرق أخطأ) -> النقطة للأحمر
      scoreRight++;
    }
    ballState.stopped = true; // إيقاف الكرة مؤقتاً لحين الإرسال القادم
    updateScoreboardUI();     // تحديث الأرقام على الشاشة فوراً
  }
}

// ════════════════════════════════════════════════════════════════
//  Animation Loop
// ════════════════════════════════════════════════════════════════
let lastTime = null;
function animate(timestamp) {
  requestAnimationFrame(animate);

  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  // 🆕 Restore Animated Sea Waves (البحث الدقيق عن مجسم البحر وتحريك أمواجه)
  scene.traverse((child) => {
    if (child.name === 'sea_water' || (child.material && child.material.uniforms && child.material.uniforms['time'])) {
      child.material.uniforms['time'].value += dt * 1.0; // يمكنك زيادة 1.0 إلى 1.5 إذا أردتِ أمواجاً أسرع
    }
  });

  // Physics stepping runs UNCONDITIONALLY every frame, regardless of match state.
  const subSteps = 4;
  for (let i = 0; i < subSteps; i++) {
    physics.step(dt / subSteps);
  }

  // Bot AI only runs during an active match.
  if (isMatchActive) {
    paddleBotLeft.notifyPhysicsEvents(physics.lastEvents);
    paddleBotRight.notifyPhysicsEvents(physics.lastEvents);
  }
  physics.lastEvents.length = 0;

  const isLegacyBotShot = fixedVelocityTypes.includes(physics.currentType);

  if (isMatchActive) {
    paddleBotLeft.update(dt, ballState);
    paddleBotRight.update(dt, ballState);
  } else {
    // Keep individual manual swing animations moving to completion even when match AI is idle
    if (paddleBotRight.swinging) {
      paddleBotRight.update(dt, ballState);
    }
    if (paddleBotLeft.swinging) {
      paddleBotLeft.update(dt, ballState);
    }
  }

  // Update paddle mesh transformations
  const tableSurfaceY = PHYSICS.tableH + PHYSICS.tableThickness;
  const paddleRaise = 0.08;
  const paddleFloorY = tableSurfaceY + paddleRaise;

  const meshLerpAlpha = Math.min(1, dt * 14);

  const rightTargetPos = new THREE.Vector3(paddleBotRight.pos.x, paddleFloorY, paddleBotRight.pos.z);
  playerPaddle.position.lerp(rightTargetPos, meshLerpAlpha);

  const leftTargetPos = new THREE.Vector3(paddleBotLeft.pos.x, paddleFloorY, paddleBotLeft.pos.z);
  botPaddle.position.lerp(leftTargetPos, meshLerpAlpha);

  playerPaddle.position.y = Math.max(paddleFloorY, playerPaddle.position.y);
  botPaddle.position.y = Math.max(paddleFloorY, botPaddle.position.y);

  const leftQuat = paddleBotLeft.getPaddleQuaternion();
  botPaddle.quaternion.slerp(leftQuat, meshLerpAlpha);

  const rightQuat = paddleBotRight.getPaddleQuaternion();
  playerPaddle.quaternion.slerp(rightQuat, meshLerpAlpha);

  // Collision detection + impulse response + autoserve are match-only.
  if (isMatchActive) {
    const checkY = tableSurfaceY + paddleRaise;
    const playerHitCheckPos = new THREE.Vector3(playerPaddle.position.x, checkY, playerPaddle.position.z);
    const botHitCheckPos = new THREE.Vector3(paddleBotLeft.pos.x, checkY, paddleBotLeft.pos.z);

    const distToPlayer = ballState.pos.distanceTo(playerHitCheckPos);
    const distToBot = ballState.pos.distanceTo(botHitCheckPos);
    const hitThreshold = 0.35;

    // رصد ضربة المضرب الأيمن (RED) وزيادة السكور والتحديث
    const rightShouldHit = paddleBotRight.shouldHit(ballState.pos) || (distToPlayer < hitThreshold);
    if (distToPlayer < hitThreshold && rightShouldHit && !ballState.stopped) {
      if (physics.checkPaddleHit(playerHitCheckPos, paddleBotRight.vel, true)) {
        const swing = applyPaddleImpulse(ballState, paddleBotRight);
        paddleBotRight.onHit(swing.pitchAmp, swing.rollAmp);
        rallyCount++;
        updateScoreboardUI(); // 🆕 هذا السطر الجديد لتحديث الـ Rally فوراً
      }
    }

    // رصد ضربة المضرب الأيسر (BLUE) وزيادة السكور والتحديث
    const leftShouldHit = paddleBotLeft.shouldHit(ballState.pos) || (distToBot < hitThreshold);
    if (distToBot < hitThreshold && leftShouldHit && !ballState.stopped) {
      if (physics.checkPaddleHit(botHitCheckPos, paddleBotLeft.vel, true)) {
        const swing = applyPaddleImpulse(ballState, paddleBotLeft);
        paddleBotLeft.onHit(swing.pitchAmp, swing.rollAmp);
        rallyCount++;
        updateScoreboardUI(); // 🆕 هذا السطر الجديد لتحديث الـ Rally فوراً
      }
    }

    const inPlay = !ballState.stopped;
    autoServeController.update(dt, inPlay, autoServe, getNextServer);
  }

  // Ball transform updates
  ballMesh.position.copy(ballState.pos);

  const spinAxis = ballState.omega.clone().normalize();
  const spinAngle = ballState.omega.length() * dt;
  if (spinAngle > 0.0001) {
    ballMesh.rotateOnWorldAxis(spinAxis, spinAngle);
  }

  trajectory.addPoint(ballState.pos);

  const surfaceY = ballState.pos.y > PHYSICS.tableH + 0.05 ? PHYSICS.tableH + 0.033 : 0.002;
  const distSurf = ballState.pos.y - surfaceY;
  const blobScale = Math.max(0.2, 1.0 - distSurf * 0.6);
  blobMesh.position.set(ballState.pos.x, surfaceY, ballState.pos.z);
  blobMesh.scale.setScalar(blobScale * currentRadius / PHYSICS.r);

  // UI Readout Updates
  const speedEl = document.getElementById('s-speed');
  const heightEl = document.getElementById('s-height');
  const omegaEl = document.getElementById('s-omega');
  const bouncesEl = document.getElementById('s-bounces');

  if (speedEl) speedEl.textContent = ballState.vel.length().toFixed(2);
  if (heightEl) heightEl.textContent = Math.max(0, ballState.pos.y - PHYSICS.tableH).toFixed(3);
  if (omegaEl) omegaEl.textContent = ballState.omega.length().toFixed(1);
  if (bouncesEl) bouncesEl.textContent = ballState.bounces;

if (isMatchActive) {
    checkAndAwardPoints();
  }
// 🆕 تثبيت حجم وميلان اللوحة ديناميكياً مهما تحركت الكاميرا
  if (scoreboardObject) {
    // أ) جعل اللوحة تتجه دائماً للكاميرا لتظل مقروءة وواضحة
    scoreboardObject.lookAt(camera.position);
    
    // ب) إضافة ميلان خفيف وثابت للخلف (مثل الصورة) على محور الـ X المحلي لتبدو حية واحترافية
    scoreboardObject.rotateX(THREE.MathUtils.degToRad(-10)); 

    // ج) الحساب العبقري لتثبيت الحجم: نقيس المسافة بين الكاميرا واللوحة
    const distance = camera.position.distanceTo(scoreboardObject.position);
    
    // عامل التناسب (كلما ابتعدت الكاميرا كبّرنا اللوحة برمجياً لتبدو ثابتة الحجم تماماً للمستخدم)
    const baseScale = 0.065; // يمكنك تعديل هذا الرقم (مثلاً 0.07 أو 0.06) لتصغير أو تكبير الحجم الثابت بالكامل
    const currentScale = distance * baseScale;
    scoreboardObject.scale.set(currentScale, currentScale, currentScale);
  }

  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera); // 🆕 تحديث موقع اللوحة مع حركة الكاميرا فريم بـ فريم
}

requestAnimationFrame(animate);

// ════════════════════════════════════════════════════════════════
//  Resize
// ════════════════════════════════════════════════════════════════
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h); // 🆕 أضيفي هذا السطر لتظل أبعاد اللوحة متناسقة مع حجم المتصفح
});