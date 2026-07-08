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

import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

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

const css3dRenderer = new CSS3DRenderer();
css3dRenderer.setSize(container.clientWidth, container.clientHeight);
css3dRenderer.domElement.style.position = 'absolute';
css3dRenderer.domElement.style.top = '0px';
css3dRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(css3dRenderer.domElement);

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
let isMatchActive = false;
let currentServerSide = 'left';
let rallyCount = 0;

let lastHitterSide = null;
let targetRallyLength = 4;
let pendingFault = null;

// 🆕 Real table-tennis scoring rules.
const POINTS_TO_WIN = 11;
const WIN_BY = 2;
const initialServer = 'left'; // who serves first, ever
let gameOver = false;
let gameWinner = null;

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

  rallyCount = 0;
  scoreLeft = 0;
  scoreRight = 0;
  pendingFault = null;
  lastHitterSide = null;
  targetRallyLength = 4;
  gameOver = false;        // 🆕
  gameWinner = null;       // 🆕
  currentServerSide = initialServer; // 🆕 reset serve rotation for a new game
  updateScoreboardUI();

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

  // 🆕 Fresh rally target + clean fault state for the new point.
  targetRallyLength = THREE.MathUtils.randInt(3, 7);
  pendingFault = null;
  lastHitterSide = side;

  const { v0, theta } = getLaunchParams();
  const spinTypeValue = spinSelect ? spinSelect.value : 'topspin';

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
    case 'topspin': ballState.omega.set(0, 0, -(omegaMag || 3)); break;
    case 'backspin': ballState.omega.set(0, 0, omegaMag || 3); break;
    case 'sidespin': ballState.omega.set(0, (omegaMag || 6), 0); break;
    default: ballState.omega.set(0, 0, 0);
  }

  physics.currentType = spinTypeValue;
  physics.justLaunched = true;
  rallyCount = 0;
  updateScoreboardUI();
  trajectory.clear();
}

// 🆕 No longer toggles blindly every point. currentServerSide is now
// computed once per point inside awardPoint() using real table-tennis
// rotation (serve switches every 2 points, or every point once both
// sides reach 10 — deuce). This function just hands that already-decided
// value to AutoServeController.
function getNextServer() {
  return currentServerSide;
}

// 🆕 Real serve-rotation rule: switch server every 2 total points played,
// except once both scores reach 10 (deuce), where it switches every
// single point instead — matching standard table tennis rules.
function computeNextServer(scoreLeft, scoreRight) {
  const totalPoints = scoreLeft + scoreRight;
  const inDeuce = scoreLeft >= POINTS_TO_WIN - 1 && scoreRight >= POINTS_TO_WIN - 1;

  const flips = inDeuce ? totalPoints : Math.floor(totalPoints / 2);
  const otherSide = (s) => (s === 'left' ? 'right' : 'left');

  let server = initialServer;
  for (let i = 0; i < flips; i++) server = otherSide(server);
  return server;
}

function computeScenarioWeights(rallyCount, targetRallyLength) {
  if (rallyCount < targetRallyLength - 1) {
    return { RALLY: 0.92, NET_FAULT: 0.05, OUT_OF_BOUNDS: 0.03 };
  }
  return { RALLY: 0.35, NET_FAULT: 0.35, OUT_OF_BOUNDS: 0.30 };
}

function applyPaddleImpulse(ballState, bot, rallyCount, targetRallyLength) {
  bot.planShot();

  const origin = ballState.pos.clone();
  const target = bot.aimTarget.clone();
  let powerShotThisHit = false; // 🆕 tracked so the velocity solve below can boost height/speed

  const weights = computeScenarioWeights(rallyCount, targetRallyLength);
  const roll = Math.random();
  let scenario;
  if (roll < weights.RALLY) {
    scenario = 'RALLY';
  } else if (roll < weights.RALLY + weights.NET_FAULT) {
    scenario = 'NET_FAULT';
  } else {
    scenario = 'OUT_OF_BOUNDS';
  }

  switch (scenario) {
    case 'NET_FAULT':
      target.x *= 0.15;
      // 🆕 The bot that just hit is the one at fault — the OPPONENT wins
      // this point. Decided here, deterministically, instead of guessed
      // later from wherever the ball happens to land.
      pendingFault = { faultSide: bot.side, type: 'NET_FAULT' };
      break;

    case 'OUT_OF_BOUNDS':
      {
        const sign = Math.sign(target.x) || (bot.side === 'left' ? 1 : -1);
        target.x = sign * (bot.tableHalfX + THREE.MathUtils.randFloat(0.4, 0.9));
      }
      pendingFault = { faultSide: bot.side, type: 'OUT_OF_BOUNDS' };
      break;

    case 'RALLY':
    default:
      pendingFault = null; // clean hit — no fault pending
      {
        
        const shotStyleRoll = Math.random();
        if (shotStyleRoll < 0.30) {
          const depthPush = THREE.MathUtils.randFloat(0.75, 0.95);
          target.x = Math.sign(target.x) * bot.tableHalfX * depthPush;
          powerShotThisHit = true;
        } else if (shotStyleRoll < 0.65) {
          const cornerBias = Math.sign(target.z) || (Math.random() < 0.5 ? 1 : -1);
          target.z = cornerBias * THREE.MathUtils.randFloat(PHYSICS.tableW * 0.25, PHYSICS.tableW * 0.45);
        }
        // remaining ~35% keep planShot()'s default safe placement
      }
      break;
  }

  const dx = target.x - origin.x;
  const dz = target.z - origin.z;

const flightTime = scenario === 'RALLY'
    ? (powerShotThisHit ? THREE.MathUtils.randFloat(0.6, 0.75) : THREE.MathUtils.randFloat(0.45, 0.6))
    : THREE.MathUtils.randFloat(0.6, 0.8);
      let vx = dx / flightTime;
  let vz = dz / flightTime;

  const GRAVITY = 9.8;
  const tableSurfaceY = PHYSICS.tableH + PHYSICS.tableThickness;
  const netHeightAboveTable = PHYSICS.netHeight ?? 0.15;
  const CLEARANCE_MARGIN = scenario === 'RALLY' ? 0.15 : 0.02;
  const netTopY = tableSurfaceY + netHeightAboveTable + CLEARANCE_MARGIN;

  let tNet = Math.abs(vx) > 0.001 ? (0 - origin.x) / vx : flightTime * 0.5;
  tNet = THREE.MathUtils.clamp(tNet, 0.05, flightTime - 0.05);

let vy = ((netTopY - origin.y) + 0.5 * GRAVITY * tNet * tNet) / tNet;
  vy = THREE.MathUtils.clamp(vy, 3.0, 6.5);
  if (powerShotThisHit) {
    vy += THREE.MathUtils.randFloat(1.0, 2.0); // 🆕 extra arc height for the power shot
  }

  const jitter = (mag) => THREE.MathUtils.randFloatSpread(mag);
  if (scenario === 'RALLY') {
    vx += jitter(0.2); vz += jitter(0.2); vy += jitter(0.1);
  } else {
    vx += jitter(0.5); vz += jitter(0.5); vy += jitter(0.2);
  }

  vx += bot.vel.x * 0.15;
  vz += bot.vel.z * 0.15;

  const finalVel = new THREE.Vector3(vx, vy, vz);
  
  const speed = THREE.MathUtils.clamp(finalVel.length(), 5.5, powerShotThisHit ? 15.0 : 12.0);
  finalVel.setLength(speed);
  finalVel.y = Math.max(finalVel.y, powerShotThisHit ? 3.5 : 2.5);

  ballState.vel.copy(finalVel);

  const spinTopBack = THREE.MathUtils.clamp(-bot.pitch * 6 + jitter(1.5), -8, 8);
  const spinSide = THREE.MathUtils.clamp(bot.roll * 6 + jitter(1.0), -8, 8);
  ballState.omega.set(0, spinSide, spinTopBack);

  const sideSign = bot.side === 'left' ? 1 : -1;
  const powerFactor = THREE.MathUtils.clamp(speed / 12.0, 0.3, 1);
  return {
    pitchAmp: sideSign * THREE.MathUtils.lerp(0.3, 0.75, powerFactor),
    rollAmp: bot.roll * 0.8,
    scenario // exposed in case you want to react to it elsewhere later
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

const scoreDiv = document.createElement('div');
scoreDiv.className = 'scoreboard-container';
scoreDiv.innerHTML = `
  <div style="display: flex; flex-direction: column; align-items: center; font-family: 'Segoe UI', sans-serif; background: rgba(15, 15, 25, 0.9); color: white; padding: 6px 14px; border-radius: 8px; border: 1.5px solid #3478c2; box-shadow: 0 0 10px rgba(52, 120, 194, 0.4); min-width: 150px; text-align: center; user-select: none;">
    <div style="font-size: 8px; text-transform: uppercase; letter-spacing: 1.5px; color: #a0aec0; margin-bottom: 2px;">Scoreboard</div>
    <div style="display: flex; justify-content: space-between; width: 100%; align-items: center; margin-bottom: 2px;">
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 9px; color: #3478c2; font-weight: bold;">
          BLUE <span id="serve-dot-left" style="display:none; color:#00ffcc;">●</span>
        </div>
        <div id="score-left-val" style="font-size: 22px; font-weight: bold; font-family: monospace; line-height: 1;">0</div>
      </div>
      <div style="font-size: 12px; color: #4a5568; font-weight: bold; padding: 0 6px;">:</div>
      <div style="text-align: center; flex: 1;">
        <div style="font-size: 9px; color: #d64545; font-weight: bold;">
          RED <span id="serve-dot-right" style="display:none; color:#00ffcc;">●</span>
        </div>
        <div id="score-right-val" style="font-size: 22px; font-weight: bold; font-family: monospace; line-height: 1;">0</div>
      </div>
    </div>
    <div style="border-top: 1px solid #2d3748; width: 100%; padding-top: 2px; margin-top: 2px; font-size: 9px; color: #00ffcc;">
      Rally: <span id="score-rally-val" style="font-weight: bold;">0</span>
    </div>
    <div id="game-status" style="font-size: 9px; color: #ffcc00; font-weight: bold; margin-top: 2px; min-height: 11px;"></div>
  </div>
`;

// 🆕 Measure the scoreboard's REAL rendered pixel size by temporarily
// mounting it in the document, instead of guessing a base scale. This is
// what makes the final on-screen size exact rather than approximate.
document.body.appendChild(scoreDiv);
const scoreDivRect = scoreDiv.getBoundingClientRect();
const SCORE_DIV_HEIGHT_PX = scoreDivRect.height || 90; // fallback if measurement fails
document.body.removeChild(scoreDiv);


const DESIRED_SCREEN_HEIGHT_PX = 62;

const scoreboardObject = new CSS3DObject(scoreDiv);

scoreboardObject.position.set(0, PHYSICS.tableH + 2.4, -5.5);
scoreboardObject.rotation.set(THREE.MathUtils.degToRad(-12), 0, 0);

scene.add(scoreboardObject);

// دالة تحديث الأرقام برمجياً في اللوحة عند كل ضربة أو تغيير في النتيجة
function updateScoreboardUI() {
  const leftEl = document.getElementById('score-left-val');
  const rightEl = document.getElementById('score-right-val');
  const rallyEl = document.getElementById('score-rally-val');
  const serveDotLeft = document.getElementById('serve-dot-left');
  const serveDotRight = document.getElementById('serve-dot-right');
  const statusEl = document.getElementById('game-status');

  if (leftEl) leftEl.textContent = scoreLeft;
  if (rightEl) rightEl.textContent = scoreRight;
  if (rallyEl) rallyEl.textContent = rallyCount;

  // 🆕 Serve indicator dot next to whichever side is currently serving.
  if (serveDotLeft) serveDotLeft.style.display = (currentServerSide === 'left' && !gameOver) ? 'inline' : 'none';
  if (serveDotRight) serveDotRight.style.display = (currentServerSide === 'right' && !gameOver) ? 'inline' : 'none';

  // 🆕 Game-over banner.
  if (statusEl) {
    if (gameOver) {
      statusEl.textContent = `GAME — ${gameWinner === 'left' ? 'BLUE' : 'RED'} WINS!`;
    } else {
      const leadMargin = Math.abs(scoreLeft - scoreRight);
      const nearMatchPoint = (scoreLeft >= POINTS_TO_WIN - 1 || scoreRight >= POINTS_TO_WIN - 1) && leadMargin < WIN_BY;
      statusEl.textContent = nearMatchPoint ? 'DEUCE' : '';
    }
  }
}

function awardPoint(winningSide) {
  if (winningSide === 'left') {
    scoreLeft++;
  } else {
    scoreRight++;
  }

  // 🆕 Win condition: first to POINTS_TO_WIN, ahead by at least WIN_BY.
  const leadMargin = Math.abs(scoreLeft - scoreRight);
  const someoneReachedTarget = scoreLeft >= POINTS_TO_WIN || scoreRight >= POINTS_TO_WIN;

  if (someoneReachedTarget && leadMargin >= WIN_BY) {
    gameOver = true;
    gameWinner = scoreLeft > scoreRight ? 'left' : 'right';
  } else {
    // 🆕 Only rotate serve if the game continues — decided here, once,
    // rather than toggled blindly on every AutoServeController tick.
    currentServerSide = computeNextServer(scoreLeft, scoreRight);
  }

  updateScoreboardUI();
  ballState.stopped = true;
  pendingFault = null;
}



function checkAndAwardPoints() {
  if (ballState.stopped) return;

  const tableSurfaceY = PHYSICS.tableH + PHYSICS.tableThickness;
  const outOfBoundsZ = PHYSICS.tableW / 2 + 0.3;

  const fellBelowTable = ballState.pos.y < tableSurfaceY - 0.1;
  const wentOffSide = Math.abs(ballState.pos.z) > outOfBoundsZ; // 🆕 was missing entirely before

  if (!fellBelowTable && !wentOffSide) return;

  if (pendingFault) {
    // 🆕 THE actual fix for "only Red scores": we already know exactly
    // who committed the fault from applyPaddleImpulse — award to their
    // opponent directly instead of inferring from final ball position,
    // which was the source of the imbalance.
    const opponent = pendingFault.faultSide === 'left' ? 'right' : 'left';
    awardPoint(opponent);
    return;
  }

  // No scripted fault was pending — this is a genuine unreturned ball
  // (a bot failed to reach it at all). Fall back to position: whichever
  // side the ball ended up on failed to return it, so the OPPOSITE side
  // scores.
  const sideItFellOn = ballState.pos.x >= 0 ? 'right' : 'left';
  const winner = sideItFellOn === 'right' ? 'left' : 'right';
  awardPoint(winner);
} // 🆕 this closing brace for checkAndAwardPoints() was missing

// ════════════════════════════════════════════════════════════════
//  Animation Loop
// ════════════════════════════════════════════════════════════════
let lastTime = null;
function animate(timestamp) {
  requestAnimationFrame(animate);

  if (lastTime === null) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.033);
  lastTime = timestamp;

  scene.traverse((child) => {
    if (child.name === 'sea_water' || (child.material && child.material.uniforms && child.material.uniforms['time'])) {
      child.material.uniforms['time'].value += dt * 1.0;
    }
  });

  const subSteps = 4;
  for (let i = 0; i < subSteps; i++) {
    physics.step(dt / subSteps);
  }

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
    if (paddleBotRight.swinging) paddleBotRight.update(dt, ballState);
    if (paddleBotLeft.swinging) paddleBotLeft.update(dt, ballState);
  }

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

  if (isMatchActive) {
    const checkY = tableSurfaceY + paddleRaise;
    const playerHitCheckPos = new THREE.Vector3(playerPaddle.position.x, checkY, playerPaddle.position.z);
    const botHitCheckPos = new THREE.Vector3(paddleBotLeft.pos.x, checkY, paddleBotLeft.pos.z);

    const distToPlayer = ballState.pos.distanceTo(playerHitCheckPos);
    const distToBot = ballState.pos.distanceTo(botHitCheckPos);
    const hitThreshold = 0.35;

    const rightShouldHit = paddleBotRight.shouldHit(ballState.pos) || (distToPlayer < hitThreshold);
    if (distToPlayer < hitThreshold && rightShouldHit && !ballState.stopped) {
      if (physics.checkPaddleHit(playerHitCheckPos, paddleBotRight.vel, true)) {
        lastHitterSide = 'right'; // 🆕
        const swing = applyPaddleImpulse(ballState, paddleBotRight, rallyCount, targetRallyLength); // 🆕 params
        paddleBotRight.onHit(swing.pitchAmp, swing.rollAmp);
        rallyCount++;
        updateScoreboardUI();
      }
    }

    const leftShouldHit = paddleBotLeft.shouldHit(ballState.pos) || (distToBot < hitThreshold);
    if (distToBot < hitThreshold && leftShouldHit && !ballState.stopped) {
      if (physics.checkPaddleHit(botHitCheckPos, paddleBotLeft.vel, true)) {
        lastHitterSide = 'left'; // 🆕
        const swing = applyPaddleImpulse(ballState, paddleBotLeft, rallyCount, targetRallyLength); // 🆕 params
        paddleBotLeft.onHit(swing.pitchAmp, swing.rollAmp);
        rallyCount++;
        updateScoreboardUI();
      }
    }

    // 🆕 Stop auto-serving once the game has been won — otherwise the
    // controller would keep firing new serves after a decisive point.
    if (!gameOver) {
      const inPlay = !ballState.stopped;
      autoServeController.update(dt, inPlay, autoServe, getNextServer);
    }
  }

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

  if (scoreboardObject) {
  
  const distance = camera.position.distanceTo(scoreboardObject.position);
  const vFovRad = THREE.MathUtils.degToRad(camera.fov);
  const worldHeightAtDistance = 2 * Math.tan(vFovRad / 2) * distance;
  const pixelsPerWorldUnit = container.clientHeight / worldHeightAtDistance;

  const finalScale = DESIRED_SCREEN_HEIGHT_PX / (SCORE_DIV_HEIGHT_PX * pixelsPerWorldUnit);
  scoreboardObject.scale.set(finalScale, finalScale, finalScale);
}

  controls.update();
  renderer.render(scene, camera);
  css3dRenderer.render(scene, camera); // 🆕 was labelRenderer.render(...)
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
  css3dRenderer.setSize(w, h); // 🆕 was labelRenderer.setSize(...)
});