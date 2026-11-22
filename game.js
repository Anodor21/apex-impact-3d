/* Apex Impact 3D - realistic physics target demolition
   three.js r128 (global THREE) + cannon.js 0.6.2 (global CANNON) */
'use strict';

// ---------------------------------------------------------------- config
const LAUNCH_POS = new THREE.Vector3(0, 1.3, 7);
const GRAVITY = 9.82;
const FIXED_STEP = 1 / 60;
const FALL_DROP = 1.3;        // target neutralized after dropping this far
const MAX_BALLS_PREVIEW = 5;

// ---------------------------------------------------------------- state
const state = {
  phase: 'menu',      // menu | aim | fly | eval | won | lost | paused
  level: 1,
  ballsLeft: 0,
  ballsTotal: 0,
  score: 0,
  targetsTotal: 0,
  targetsLeft: 0,
  activeBall: null,
  settleTimer: 0,
  postTimer: 0,
  winTimer: 0,
  ballSettled: false,
  shake: 0,
  soundOn: true,
  time: 0,
  prevPhase: 'menu'
};

// ---------------------------------------------------------------- dom helpers
const $ = (id) => document.getElementById(id);
const OVERLAYS = ['loading', 'menu', 'levelSelect', 'result', 'pause'];
function showOverlay(name) {
  OVERLAYS.forEach((o) => $(o).classList.toggle('active', o === name));
}
function hideOverlays() { OVERLAYS.forEach((o) => $(o).classList.remove('active')); }
const fmt = (n) => Math.floor(n).toLocaleString('id-ID');

// ---------------------------------------------------------------- renderer / scene
const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb07a5a, 0.006);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 6.5, 20);

const camLook = new THREE.Vector3(0, 4.5, -3);
const camLookCur = camLook.clone();
const camPosGoal = new THREE.Vector3(0, 6.5, 20);
const camLookGoal = camLook.clone();

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(0xbcd3ff, 0x4a3a2a, 0.5);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffd9a0, 1.6);
sun.position.set(14, 24, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 90;
sun.shadow.camera.left = -24;
sun.shadow.camera.right = 24;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.bias = -0.0004;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x6a86c8, 0.35);
fill.position.set(-10, 8, -14);
scene.add(fill);

// ---------------------------------------------------------------- sky dome
const skyMat = new THREE.ShaderMaterial({
  uniforms: {
    topColor: { value: new THREE.Color(0x0b1a33) },
    bottomColor: { value: new THREE.Color(0xe07a3a) },
    offset: { value: 24 },
    exponent: { value: 0.7 }
  },
  vertexShader: [
    'varying vec3 vWorldPosition;',
    'void main(){',
    '  vec4 wp = modelMatrix * vec4(position, 1.0);',
    '  vWorldPosition = wp.xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n'),
  fragmentShader: [
    'uniform vec3 topColor; uniform vec3 bottomColor;',
    'uniform float offset; uniform float exponent;',
    'varying vec3 vWorldPosition;',
    'void main(){',
    '  float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;',
    '  gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);',
    '}'
  ].join('\n'),
  side: THREE.BackSide,
  depthWrite: false
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), skyMat));

// ---------------------------------------------------------------- physics world
const world = new CANNON.World();
world.gravity.set(0, -GRAVITY, 0);
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 14;
world.solver.tolerance = 0.001;
world.allowSleep = true;
world.defaultContactMaterial.friction = 0.5;
world.defaultContactMaterial.restitution = 0.15;

const physMat = {
  ground: new CANNON.Material('ground'),
  ball: new CANNON.Material('ball'),
  wood: new CANNON.Material('wood'),
  concrete: new CANNON.Material('concrete'),
  glass: new CANNON.Material('glass'),
  target: new CANNON.Material('target')
};
function contact(a, b, friction, restitution) {
  world.addContactMaterial(new CANNON.ContactMaterial(a, b, { friction, restitution }));
}
contact(physMat.ball, physMat.wood, 0.4, 0.22);
contact(physMat.ball, physMat.concrete, 0.3, 0.12);
contact(physMat.ball, physMat.glass, 0.2, 0.1);
contact(physMat.ball, physMat.target, 0.3, 0.3);
contact(physMat.ball, physMat.ground, 0.35, 0.3);
contact(physMat.wood, physMat.wood, 0.6, 0.1);
contact(physMat.concrete, physMat.ground, 0.85, 0.05);

// ---------------------------------------------------------------- shared mesh materials
const meshMats = {
  wood: new THREE.MeshStandardMaterial({ color: 0xa9754f, roughness: 0.85, metalness: 0.02 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x9aa0a6, roughness: 0.95, metalness: 0.0 }),
  glass: new THREE.MeshStandardMaterial({
    color: 0xaee7ff, roughness: 0.06, metalness: 0.1,
    transparent: true, opacity: 0.34, emissive: 0x2a6a8a, emissiveIntensity: 0.25
  }),
  ball: new THREE.MeshStandardMaterial({ color: 0x565b68, roughness: 0.28, metalness: 0.92 })
};

// ---------------------------------------------------------------- platform (persistent)
const platform = new THREE.Mesh(
  new THREE.BoxGeometry(18, 1, 22),
  new THREE.MeshStandardMaterial({ color: 0x2e333f, roughness: 0.92, metalness: 0.05 })
);
platform.position.set(0, -0.5, -3);
platform.receiveShadow = true;
platform.castShadow = true;
scene.add(platform);

const platformEdge = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(18, 1, 22)),
  new THREE.LineBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.35 })
);
platformEdge.position.copy(platform.position);
scene.add(platformEdge);

// launch pad
const pad = new THREE.Mesh(
  new THREE.CylinderGeometry(0.8, 0.95, 0.9, 24),
  new THREE.MeshStandardMaterial({ color: 0x262b35, roughness: 0.5, metalness: 0.6 })
);
pad.position.set(0, 0.45, 7);
pad.castShadow = true;
pad.receiveShadow = true;
scene.add(pad);

const padGlow = new THREE.Mesh(
  new THREE.CircleGeometry(0.7, 24),
  new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.5 })
);
padGlow.rotation.x = -Math.PI / 2;
padGlow.position.set(0, 0.91, 7);
scene.add(padGlow);

const groundBody = new CANNON.Body({ mass: 0, material: physMat.ground });
groundBody.addShape(new CANNON.Box(new CANNON.Vec3(9, 0.5, 11)));
groundBody.position.set(0, -0.5, -3);
world.addBody(groundBody);

// ---------------------------------------------------------------- containers
const levelObjects = [];   // {mesh, body, type, ...}
const targets = [];
const projectiles = [];
const particles = [];
const removalQueue = [];

// ---------------------------------------------------------------- level definitions
const LEVELS = [
  {
    name: 'First Strike', balls: 3,
    blocks: [
      { t: 'concrete', p: [0, 0.75, -5], s: [8, 1.5, 5] },
      { t: 'wood', p: [-1.6, 3.0, -5], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [1.6, 3.0, -5], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [0, 4.8, -5], s: [4, 0.6, 0.7] }
    ],
    targets: [[-0.8, 5.72, -5], [0.8, 5.72, -5]]
  },
  {
    name: 'Twin Towers', balls: 4,
    blocks: [
      { t: 'concrete', p: [0, 0.75, -6], s: [14, 1.5, 5] },
      { t: 'wood', p: [-4.8, 3.0, -6], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [-3.2, 3.0, -6], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [-4.0, 4.8, -6], s: [3.2, 0.6, 0.7] },
      { t: 'wood', p: [3.2, 3.0, -6], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [4.8, 3.0, -6], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [4.0, 4.8, -6], s: [3.2, 0.6, 0.7] },
      { t: 'wood', p: [0, 5.35, -6], s: [5, 0.5, 0.7] }
    ],
    targets: [[-4.0, 5.72, -6], [4.0, 5.72, -6], [0, 6.22, -6]]
  },
  {
    name: 'Fragile Shield', balls: 4,
    blocks: [
      { t: 'concrete', p: [0, 0.75, -6], s: [10, 1.5, 4] },
      { t: 'concrete', p: [-4.0, 3.5, -6], s: [1, 4, 1] },
      { t: 'concrete', p: [4.0, 3.5, -6], s: [1, 4, 1] },
      { t: 'glass', p: [0, 3.5, -4], s: [6, 4, 0.3] },
      { t: 'wood', p: [0, 1.7, -6], s: [5, 0.4, 2.5] }
    ],
    targets: [[-1.6, 2.52, -6], [1.6, 2.52, -6], [0, 2.52, -5.2]]
  },
  {
    name: 'Pendulum Gate', balls: 5,
    blocks: [
      { t: 'concrete', p: [0, 0.75, -7], s: [10, 1.5, 4] },
      { t: 'wood', p: [-1.4, 3.0, -7], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [1.4, 3.0, -7], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [0, 4.8, -7], s: [3.6, 0.6, 0.7] }
    ],
    targets: [[-1.4, 5.72, -7], [0, 5.72, -7], [1.4, 5.72, -7]],
    pendulum: { pivot: [0, 8, -2.5], len: 4.5, amp: 0.95, speed: 1.25 }
  },
  {
    name: 'The Fortress', balls: 5,
    blocks: [
      { t: 'concrete', p: [0, 0.75, -7], s: [12, 1.5, 6] },
      { t: 'concrete', p: [-5.5, 3.5, -7], s: [1, 4, 5] },
      { t: 'concrete', p: [5.5, 3.5, -7], s: [1, 4, 5] },
      { t: 'glass', p: [0, 3.5, -4.3], s: [8, 4, 0.3] },
      { t: 'wood', p: [-2.0, 3.0, -7], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [2.0, 3.0, -7], s: [0.7, 3, 0.7] },
      { t: 'wood', p: [0, 4.8, -7], s: [4.5, 0.6, 0.7] }
    ],
    targets: [[-3.2, 2.12, -6.0], [3.2, 2.12, -6.0], [0, 5.72, -7], [0, 2.12, -8.8]]
  }
];

// ---------------------------------------------------------------- object factories
function addBlock(type, p, s) {
  const mass = type === 'concrete' ? 6 : type === 'glass' ? 0.8 : 1.5;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(s[0], s[1], s[2]), meshMats[type]);
  mesh.position.set(p[0], p[1], p[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = new CANNON.Body({
    mass,
    material: physMat[type],
    position: new CANNON.Vec3(p[0], p[1], p[2])
  });
  body.addShape(new CANNON.Box(new CANNON.Vec3(s[0] / 2, s[1] / 2, s[2] / 2)));
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.16;
  body.sleepTimeLimit = 0.4;
  body.linearDamping = 0.04;
  body.angularDamping = 0.06;
  world.addBody(body);

  const obj = {
    mesh, body, type,
    startPos: new THREE.Vector3(p[0], p[1], p[2]),
    startY: p[1], dead: false, scored: false
  };
  if (type === 'glass') {
    body.addEventListener('collide', (e) => {
      if (obj.dead) return;
      const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
      if (impact > 3.0) breakGlass(obj);
    });
  }
  levelObjects.push(obj);
  return obj;
}

function addTarget(p) {
  const geo = new THREE.OctahedronGeometry(0.62, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffb020, emissive: 0xff6a00, emissiveIntensity: 0.95,
    metalness: 0.4, roughness: 0.25
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(p[0], p[1], p[2]);
  mesh.castShadow = true;
  scene.add(mesh);

  const glow = new THREE.PointLight(0xffa020, 0.75, 7, 2);
  mesh.add(glow);

  const body = new CANNON.Body({
    mass: 1.2,
    material: physMat.target,
    position: new CANNON.Vec3(p[0], p[1], p[2])
  });
  body.addShape(new CANNON.Sphere(0.62));
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.16;
  body.sleepTimeLimit = 0.4;
  body.linearDamping = 0.04;
  body.angularDamping = 0.1;
  world.addBody(body);

  const obj = {
    mesh, body, type: 'target', startPos: new THREE.Vector3(p[0], p[1], p[2]),
    startY: p[1], neutralized: false, dead: false
  };
  targets.push(obj);
  levelObjects.push(obj);
  return obj;
}

function addPendulum(cfg) {
  const pivot = new THREE.Vector3(cfg.pivot[0], cfg.pivot[1], cfg.pivot[2]);
  const half = cfg.len / 2;
  const group = new THREE.Group();
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.7, cfg.len, 0.7), meshMats.concrete);
  beam.position.set(0, -half, 0);
  beam.castShadow = true;
  beam.receiveShadow = true;
  group.add(beam);
  group.position.copy(pivot);
  scene.add(group);

  const body = new CANNON.Body({ mass: 0, material: physMat.concrete });
  body.type = CANNON.Body.KINEMATIC;
  body.addShape(new CANNON.Box(new CANNON.Vec3(0.35, half, 0.35)), new CANNON.Vec3(0, -half, 0));
  body.position.set(pivot.x, pivot.y, pivot.z);
  world.addBody(body);

  const obj = {
    mesh: group, body, type: 'pendulum', isPendulum: true,
    pivot, half, amp: cfg.amp, speed: cfg.speed, phase: 0, dead: false
  };
  levelObjects.push(obj);
  return obj;
}

// preview projectile shown while aiming
const previewBall = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), meshMats.ball);
previewBall.position.copy(LAUNCH_POS);
previewBall.castShadow = true;
previewBall.visible = false;
scene.add(previewBall);

// ---------------------------------------------------------------- build / clear
function buildLevel(idx) {
  const L = LEVELS[idx - 1];
  L.blocks.forEach((b) => addBlock(b.t, b.p, b.s));
  L.targets.forEach((p) => addTarget(p));
  if (L.pendulum) addPendulum(L.pendulum);
}

function disposeObject(o) {
  if (o.body) world.removeBody(o.body);
  if (o.mesh) {
    o.mesh.traverse ? o.mesh.traverse((c) => { if (c.geometry) c.geometry.dispose(); }) : null;
    if (o.mesh.geometry) o.mesh.geometry.dispose();
    if (o.type === 'target' && o.mesh.material) o.mesh.material.dispose();
    scene.remove(o.mesh);
  }
}

function clearLevel() {
  projectiles.forEach((p) => {
    world.removeBody(p.body);
    scene.remove(p.mesh);
    p.mesh.geometry.dispose();
  });
  projectiles.length = 0;

  particles.forEach((pt) => {
    scene.remove(pt.mesh);
    pt.mesh.geometry.dispose();
    pt.mesh.material.dispose();
  });
  particles.length = 0;

  levelObjects.forEach(disposeObject);
  levelObjects.length = 0;
  targets.length = 0;
  removalQueue.length = 0;
  state.activeBall = null;
  previewBall.visible = false;
}

// ---------------------------------------------------------------- glass / particles / removal
function breakGlass(obj) {
  if (obj.dead) return;
  obj.dead = true;
  state.score += 150;
  state.shake = Math.min(1.5, state.shake + 0.5);
  const pos = new THREE.Vector3(obj.body.position.x, obj.body.position.y, obj.body.position.z);
  spawnParticles(pos, 0xbfe9ff, 16, 6, 0.09, false);
  playSound('glass');
  updateHUD();
  queueRemoval(obj);
}

function spawnParticles(pos, color, count, speed, size, emissive) {
  const geo = new THREE.BoxGeometry(size, size, size);
  for (let i = 0; i < count; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.2, metalness: emissive ? 0.5 : 0.1,
      transparent: true, opacity: 1,
      emissive: emissive ? color : 0x000000, emissiveIntensity: emissive ? 1 : 0
    });
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(pos);
    scene.add(m);
    particles.push({
      mesh: m,
      vel: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, (Math.random() - 0.5) * speed),
      life: 0.9 + Math.random() * 0.4,
      maxLife: 1.3
    });
  }
}

function spawnBurst(pos, color) {
  spawnParticles(pos, color, 14, 5, 0.11, true);
}

function queueRemoval(o) { removalQueue.push(o); }

function processRemovals() {
  while (removalQueue.length) {
    const o = removalQueue.pop();
    if (o.body) world.removeBody(o.body);
    if (o.mesh) {
      scene.remove(o.mesh);
      if (o.mesh.geometry) o.mesh.geometry.dispose();
      if (o.type === 'target' && o.mesh.material) o.mesh.material.dispose();
    }
    let i = levelObjects.indexOf(o);
    if (i >= 0) levelObjects.splice(i, 1);
    i = targets.indexOf(o);
    if (i >= 0) targets.splice(i, 1);
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.vel.y -= GRAVITY * dt;
    pt.mesh.position.addScaledVector(pt.vel, dt);
    pt.life -= dt;
    pt.mesh.material.opacity = Math.max(0, pt.life / pt.maxLife);
    pt.mesh.rotation.x += dt * 3;
    pt.mesh.rotation.y += dt * 2;
    if (pt.life <= 0) {
      scene.remove(pt.mesh);
      pt.mesh.geometry.dispose();
      pt.mesh.material.dispose();
      particles.splice(i, 1);
    }
  }
}

function cleanupProjectiles() {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    if (p === state.activeBall) continue;
    if (p.body.position.y < -30) {
      world.removeBody(p.body);
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      projectiles.splice(i, 1);
    }
  }
}

// ---------------------------------------------------------------- sync + detection
function syncMeshes() {
  for (const o of levelObjects) {
    if (o.isPendulum || o.dead) continue;
    o.mesh.position.copy(o.body.position);
    o.mesh.quaternion.copy(o.body.quaternion);
  }
  for (const p of projectiles) {
    p.mesh.position.copy(p.body.position);
    p.mesh.quaternion.copy(p.body.quaternion);
  }
}

function checkDisplacement() {
  for (const o of levelObjects) {
    if (o.type !== 'wood' && o.type !== 'concrete') continue;
    if (o.scored) continue;
    const dx = o.body.position.x - o.startPos.x;
    const dy = o.body.position.y - o.startPos.y;
    const dz = o.body.position.z - o.startPos.z;
    if (dx * dx + dy * dy + dz * dz > 1.44) {
      o.scored = true;
      state.score += o.type === 'wood' ? 80 : 120;
      updateHUD();
    }
  }
}

function checkTargets() {
  for (const t of targets) {
    if (t.neutralized) continue;
    const p = t.body.position;
    const dropped = p.y < t.startY - FALL_DROP;
    const low = p.y < 0.4;
    const out = Math.abs(p.x) > 8.6 || p.z > 7.6 || p.z < -13.6;
    if (dropped || low || out) {
      t.neutralized = true;
      state.targetsLeft--;
      state.score += 250;
      state.shake = Math.min(1.5, state.shake + 0.3);
      spawnBurst(new THREE.Vector3(t.body.position.x, t.body.position.y, t.body.position.z), 0xffb020);
      playSound('target');
      updateHUD();
    }
  }
}

// ---------------------------------------------------------------- audio
let audioCtx = null;
function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { /* no audio */ }
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
}
function playSound(kind) {
  if (!state.soundOn || !audioCtx) return;
  const t = audioCtx.currentTime;
  if (kind === 'win') {
    [523, 659, 784, 1047].forEach((f, i) => {
      const oo = audioCtx.createOscillator(), gg = audioCtx.createGain();
      oo.connect(gg); gg.connect(audioCtx.destination);
      oo.type = 'triangle'; oo.frequency.value = f;
      const st = t + i * 0.12;
      gg.gain.setValueAtTime(0.001, st);
      gg.gain.linearRampToValueAtTime(0.14, st + 0.02);
      gg.gain.exponentialRampToValueAtTime(0.001, st + 0.3);
      oo.start(st); oo.stop(st + 0.32);
    });
    return;
  }
  const o = audioCtx.createOscillator(), g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  if (kind === 'launch') {
    o.type = 'triangle'; o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.18);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.start(t); o.stop(t + 0.24);
  } else if (kind === 'impact') {
    o.type = 'square'; o.frequency.setValueAtTime(95, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.start(t); o.stop(t + 0.16);
  } else if (kind === 'glass') {
    o.type = 'sawtooth'; o.frequency.setValueAtTime(1400, t);
    o.frequency.exponentialRampToValueAtTime(600, t + 0.2);
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.start(t); o.stop(t + 0.24);
  } else if (kind === 'target') {
    o.type = 'sine'; o.frequency.setValueAtTime(660, t);
    o.frequency.exponentialRampToValueAtTime(990, t + 0.15);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.start(t); o.stop(t + 0.32);
  } else if (kind === 'lose') {
    o.type = 'sawtooth'; o.frequency.setValueAtTime(300, t);
    o.frequency.exponentialRampToValueAtTime(80, t + 0.5);
    g.gain.setValueAtTime(0.14, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    o.start(t); o.stop(t + 0.56);
  } else {
    o.disconnect(); g.disconnect();
  }
}

// ---------------------------------------------------------------- aiming
const AIM = { dragging: false, startX: 0, startY: 0, yaw: 0, pitch: 0.42, power: 0.55 };

const TRAJ_MAX = 60;
const trajGeo = new THREE.BufferGeometry();
trajGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(TRAJ_MAX * 3), 3));
const trajMat = new THREE.PointsMaterial({
  color: 0xfbbf24, size: 0.18, transparent: true, opacity: 0.85,
  depthWrite: false, sizeAttenuation: true
});
const traj = new THREE.Points(trajGeo, trajMat);
traj.frustumCulled = false;
traj.visible = false;
scene.add(traj);

function computeLaunchVelocity() {
  const speed = 10 + AIM.power * 10;
  const cy = Math.cos(AIM.yaw), sy = Math.sin(AIM.yaw);
  const cp = Math.cos(AIM.pitch), sp = Math.sin(AIM.pitch);
  return new THREE.Vector3(sy * cp * speed, sp * speed, -cy * cp * speed);
}

function updateTrajectory() {
  if (state.phase !== 'aim') { traj.visible = false; return; }
  const v = computeLaunchVelocity();
  const arr = trajGeo.attributes.position.array;
  let n = 0;
  for (let t = 0; t < 2.6 && n < TRAJ_MAX; t += 0.055) {
    const x = LAUNCH_POS.x + v.x * t;
    const y = LAUNCH_POS.y + v.y * t - 0.5 * GRAVITY * t * t;
    const z = LAUNCH_POS.z + v.z * t;
    if (y < 0.25) { arr[n * 3] = x; arr[n * 3 + 1] = 0.25; arr[n * 3 + 2] = z; n++; break; }
    arr[n * 3] = x; arr[n * 3 + 1] = y; arr[n * 3 + 2] = z; n++;
  }
  trajGeo.setDrawRange(0, n);
  trajGeo.attributes.position.needsUpdate = true;
  traj.visible = n > 0;
}

function updateAimFromDrag(x, y) {
  const dx = x - AIM.startX, dy = y - AIM.startY;
  const len = Math.hypot(dx, dy);
  if (len < 6) return;
  const maxDrag = 260;
  AIM.power = Math.min(0.2 + len / maxDrag, 1);
  AIM.yaw = THREE.MathUtils.clamp((dx / maxDrag) * 0.9, -0.75, 0.75);
  AIM.pitch = THREE.MathUtils.clamp(0.42 + (-dy / maxDrag) * 0.9, -0.1, 0.95);
  updateTrajectory();
  updatePowerMeter();
}

function updatePowerMeter() {
  $('power-fill').style.width = (AIM.power * 100).toFixed(0) + '%';
  $('power-wrap').classList.toggle('show', state.phase === 'aim');
}

function setAimHint(text) {
  const el = $('aim-hint');
  el.textContent = text;
  el.style.opacity = text ? '1' : '0';
}

function onPointerDown(e) {
  if (state.phase !== 'aim') return;
  ensureAudio();
  AIM.dragging = true;
  AIM.startX = e.clientX; AIM.startY = e.clientY;
  setAimHint('');
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
}
function onPointerMove(e) {
  if (!AIM.dragging || state.phase !== 'aim') return;
  updateAimFromDrag(e.clientX, e.clientY);
}
function onPointerUp() {
  if (!AIM.dragging) return;
  AIM.dragging = false;
  if (state.phase !== 'aim') return;
  launchBall();
}
canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', () => { AIM.dragging = false; });

// ---------------------------------------------------------------- launch
function onBallCollide(e) {
  const impact = Math.abs(e.contact.getImpactVelocityAlongNormal());
  if (impact > 2.5) {
    state.shake = Math.min(1.5, state.shake + impact * 0.04);
    if (impact > 6) playSound('impact');
  }
}

function launchBall() {
  if (state.phase !== 'aim' || state.ballsLeft <= 0) return;
  const vel = computeLaunchVelocity();

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 24), meshMats.ball);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.position.copy(LAUNCH_POS);
  scene.add(mesh);

  const body = new CANNON.Body({
    mass: 5, material: physMat.ball,
    position: new CANNON.Vec3(LAUNCH_POS.x, LAUNCH_POS.y, LAUNCH_POS.z)
  });
  body.addShape(new CANNON.Sphere(0.45));
  body.velocity.set(vel.x, vel.y, vel.z);
  body.linearDamping = 0.008;
  body.angularDamping = 0.1;
  body.allowSleep = true;
  body.sleepSpeedLimit = 0.25;
  body.sleepTimeLimit = 0.5;
  body.addEventListener('collide', onBallCollide);
  world.addBody(body);

  const obj = { mesh, body };
  projectiles.push(obj);
  state.activeBall = obj;
  state.ballsLeft--;
  state.phase = 'fly';
  state.ballSettled = false;
  state.settleTimer = 0;
  state.postTimer = 0;
  state.winTimer = 0;
  previewBall.visible = false;
  traj.visible = false;
  $('power-wrap').classList.remove('show');
  updateBallsHUD();
  updateHUD();
  playSound('launch');
}

function beginAim() {
  if (state.ballsLeft <= 0) return;
  state.phase = 'aim';
  state.activeBall = null;
  AIM.power = 0.55;
  AIM.yaw = 0;
  AIM.pitch = 0.42;
  previewBall.visible = true;
  updateTrajectory();
  updatePowerMeter();
  updateHUD();
  setAimHint('Tarik dan lepaskan untuk membidik');
}

// ---------------------------------------------------------------- pendulum
function updatePendulum(dt) {
  for (const o of levelObjects) {
    if (!o.isPendulum) continue;
    o.phase += dt * o.speed;
    const angle = Math.sin(o.phase) * o.amp;
    const omega = Math.cos(o.phase) * o.amp * o.speed;
    const q = new CANNON.Quaternion();
    q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), angle);
    o.body.quaternion.copy(q);
    o.body.angularVelocity.set(0, 0, omega);
    o.mesh.quaternion.copy(q);
  }
}

// ---------------------------------------------------------------- camera
function updateCamera(dt) {
  if (state.phase === 'menu') {
    state.menuAngle += dt * 0.16;
    const r = 20;
    camPosGoal.set(Math.sin(state.menuAngle) * r, 8.5, -6 + Math.cos(state.menuAngle) * r);
    camLookGoal.set(0, 4, -6);
  } else if (state.phase === 'aim') {
    camPosGoal.set(0, 6.5, 20);
    camLookGoal.set(0, 4.5, -3);
  } else if (state.phase === 'fly' && state.activeBall) {
    const b = state.activeBall.body.position;
    camPosGoal.set(b.x * 0.5, b.y + 3.2, b.z + 9);
    camLookGoal.set(b.x, b.y, b.z);
  } else if (state.phase === 'eval' || state.phase === 'won' || state.phase === 'lost') {
    camPosGoal.set(0, 10.5, 18);
    camLookGoal.set(0, 3.5, -6);
  }
  const pk = state.phase === 'fly' ? 0.15 : 0.06;
  const lk = state.phase === 'fly' ? 0.22 : 0.08;
  camera.position.lerp(camPosGoal, pk);
  camLookCur.lerp(camLookGoal, lk);
  camera.lookAt(camLookCur);
}

const shakeOff = new THREE.Vector3();
function renderWithShake() {
  const active = state.shake > 0.001;
  if (active) {
    shakeOff.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
      .multiplyScalar(state.shake * 0.55);
    camera.position.add(shakeOff);
  }
  renderer.render(scene, camera);
  if (active) camera.position.sub(shakeOff);
}

// ---------------------------------------------------------------- game logic
function updateGameLogic(dt) {
  if (state.phase !== 'fly' && state.phase !== 'eval') return;

  if (state.targetsLeft <= 0) {
    state.winTimer += dt;
    if (state.winTimer > 1.1) { endLevel(true); return; }
  }

  const b = state.activeBall;
  if (b && !state.ballSettled) {
    const v = b.body.velocity;
    const sp = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    const off = b.body.position.y < -4;
    if (sp < 0.7 || off) state.settleTimer += dt;
    else state.settleTimer = Math.max(0, state.settleTimer - dt * 2);
    if (state.settleTimer > 0.8 || off) {
      state.ballSettled = true;
      state.phase = 'eval';
      state.postTimer = 0;
    }
  }

  if (state.ballSettled) {
    state.postTimer += dt;
    if (state.targetsLeft <= 0) return;
    if (state.postTimer > 1.5) {
      if (state.ballsLeft <= 0) endLevel(false);
      else beginAim();
    }
  }
}

function endLevel(win) {
  if (state.phase === 'won' || state.phase === 'lost') return;
  state.phase = win ? 'won' : 'lost';

  const bonus = win ? state.ballsLeft * 500 : 0;
  const destruction = state.score;
  const total = destruction + bonus;

  let stars = 0;
  if (win) {
    stars = state.ballsLeft >= 2 ? 3 : (state.ballsLeft === 1 ? 2 : 1);
    const d = loadStars();
    d[state.level] = Math.max(d[state.level] || 0, stars);
    saveStars(d);
    updateMenuStars();
    playSound('win');
  } else {
    playSound('lose');
  }

  $('result-title').textContent = win ? 'LEVEL SELESAI!' : 'GAME OVER';
  $('result-stars').textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
  $('res-destroy').textContent = fmt(destruction);
  $('res-bonus').textContent = fmt(bonus);
  $('res-total').textContent = fmt(total);

  const next = $('btn-next');
  if (win && state.level < LEVELS.length) {
    next.textContent = 'LANJUT →';
    next.onclick = () => startLevel(state.level + 1);
  } else {
    next.textContent = 'MENU UTAMA';
    next.onclick = () => goMenu();
  }
  $('btn-replay').onclick = () => startLevel(state.level);

  $('hud').classList.remove('show');
  traj.visible = false;
  previewBall.visible = false;
  $('power-wrap').classList.remove('show');
  showOverlay('result');
}

// ---------------------------------------------------------------- HUD
function updateHUD() {
  $('hud-level').textContent = 'LEVEL ' + state.level;
  $('hud-score').textContent = 'SKOR ' + fmt(state.score);
  $('hud-targets').textContent = state.targetsLeft + '/' + state.targetsTotal;
}

function updateBallsHUD() {
  const c = $('hud-balls');
  c.innerHTML = '';
  for (let i = 0; i < state.ballsTotal; i++) {
    const d = document.createElement('span');
    d.className = 'ball-dot' + (i < state.ballsLeft ? ' filled' : '');
    c.appendChild(d);
  }
  c.classList.toggle('low', state.ballsLeft === 1);
}

// ---------------------------------------------------------------- persistence
const STORAGE_KEY = 'apex_impact_stars_v1';
function loadStars() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (_) { return {}; }
}
function saveStars(d) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (_) { /* ignore */ }
}
function starsFor(level) { return loadStars()[level] || 0; }
function maxUnlocked() {
  const d = loadStars();
  let m = 1;
  for (let i = 1; i <= LEVELS.length; i++) {
    if ((d[i] || 0) > 0) m = Math.min(i + 1, LEVELS.length);
  }
  return m;
}
function totalStars() {
  const d = loadStars();
  let s = 0;
  for (let i = 1; i <= LEVELS.length; i++) s += (d[i] || 0);
  return s;
}
function updateMenuStars() { $('total-stars').textContent = totalStars(); }

// ---------------------------------------------------------------- level select
function renderLevelSelect() {
  const grid = $('level-grid');
  grid.innerHTML = '';
  const unlocked = maxUnlocked();
  LEVELS.forEach((L, i) => {
    const lvl = i + 1;
    const stars = starsFor(lvl);
    const locked = lvl > unlocked;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'level-card' + (locked ? ' locked' : '');
    btn.innerHTML =
      '<div class="lc-num">LEVEL ' + lvl + '</div>' +
      '<div class="lc-name">' + L.name + '</div>' +
      '<div class="lc-stars">' + '★'.repeat(stars) + '☆'.repeat(3 - stars) + '</div>' +
      (locked ? '<div class="lc-lock">TERKUNCI</div>' : '');
    if (locked) btn.disabled = true;
    else btn.onclick = () => { ensureAudio(); startLevel(lvl); };
    grid.appendChild(btn);
  });
}

// ---------------------------------------------------------------- flow
function startLevel(n) {
  ensureAudio();
  clearLevel();
  state.level = n;
  state.ballsTotal = LEVELS[n - 1].balls;
  state.ballsLeft = state.ballsTotal;
  state.score = 0;
  state.targetsTotal = LEVELS[n - 1].targets.length;
  state.targetsLeft = state.targetsTotal;
  state.ballSettled = false;
  state.settleTimer = 0;
  state.postTimer = 0;
  state.winTimer = 0;
  state.activeBall = null;
  state.shake = 0;

  buildLevel(n);

  hideOverlays();
  $('hud').classList.add('show');
  AIM.dragging = false;
  AIM.power = 0.55;
  AIM.yaw = 0;
  AIM.pitch = 0.42;
  state.phase = 'aim';
  previewBall.visible = true;

  camPosGoal.set(0, 6.5, 20);
  camLookGoal.set(0, 4.5, -3);
  camera.position.set(0, 6.5, 20);
  camLookCur.set(0, 4.5, -3);

  updateHUD();
  updateBallsHUD();
  updatePowerMeter();
  updateTrajectory();
  setAimHint('Tarik dan lepaskan untuk membidik');
}

function goMenu() {
  clearLevel();
  state.phase = 'menu';
  state.level = 1;
  buildLevel(1);
  previewBall.visible = false;
  traj.visible = false;
  $('power-wrap').classList.remove('show');
  $('hud').classList.remove('show');
  renderLevelSelect();
  updateMenuStars();
  showOverlay('menu');
}

function pauseGame() {
  if (state.phase !== 'aim' && state.phase !== 'fly' && state.phase !== 'eval') return;
  state.prevPhase = state.phase;
  state.phase = 'paused';
  showOverlay('pause');
}

function resumeGame() {
  if (state.phase !== 'paused') return;
  state.phase = state.prevPhase || 'aim';
  hideOverlays();
  if (state.phase === 'aim') updatePowerMeter();
}

function toggleSound() {
  state.soundOn = !state.soundOn;
  const btn = $('btn-sound');
  btn.innerHTML = state.soundOn ? '&#128266;' : '&#128263;';
  btn.setAttribute('aria-label', state.soundOn ? 'Suara aktif' : 'Suara mati');
  if (state.soundOn) { ensureAudio(); playSound('target'); }
}

// ---------------------------------------------------------------- bindings
$('btn-sound').onclick = toggleSound;
$('btn-play').onclick = () => { ensureAudio(); startLevel(maxUnlocked()); };
$('btn-levels').onclick = () => { renderLevelSelect(); showOverlay('levelSelect'); };
$('btn-back-menu').onclick = () => showOverlay('menu');
$('btn-reset').onclick = () => startLevel(state.level);
$('btn-pause').onclick = pauseGame;
$('btn-resume').onclick = resumeGame;
$('btn-restart-pause').onclick = () => startLevel(state.level);
$('btn-menu-pause').onclick = goMenu;

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape') {
    if (state.phase === 'paused') resumeGame();
    else pauseGame();
  } else if (e.code === 'KeyR' && (state.phase === 'aim' || state.phase === 'fly' || state.phase === 'eval')) {
    startLevel(state.level);
  }
});

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  state.time += dt;

  if (state.phase === 'paused') { renderWithShake(); return; }

  updatePendulum(dt);
  world.step(FIXED_STEP, dt, 3);
  processRemovals();
  cleanupProjectiles();
  syncMeshes();
  updateParticles(dt);

  if (state.phase !== 'menu') {
    if (state.phase === 'fly' || state.phase === 'eval') checkDisplacement();
    checkTargets();
    updateGameLogic(dt);
  }

  updateCamera(dt);
  state.shake *= 0.9;
  renderWithShake();
}

// ---------------------------------------------------------------- init
function init() {
  state.menuAngle = 0;
  renderLevelSelect();
  updateMenuStars();
  buildLevel(1);
  state.phase = 'menu';
  camera.position.set(0, 8.5, 14);
  camPosGoal.set(0, 8.5, 14);
  showOverlay('menu');
  $('hud').classList.remove('show');
  animate();
}

// let the loading overlay paint first, then build the arena
requestAnimationFrame(function () {
  try {
    init();
  } catch (err) {
    const l = document.getElementById('loading');
    if (l) {
      l.innerHTML = '<div class="panel" style="text-align:center">Gagal memuat arena 3D.<br><small>' +
        (err && err.message ? err.message : '') + '</small></div>';
    }
  }
});
