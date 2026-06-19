import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const clamp = (n) => Math.max(0, Math.min(100, n));
const saveKey = 'parenting-simulator-save-v3';

const fresh = () => ({
  mood: 74, energy: 72, health: 78, learning: 32, social: 38, trust: 66, stress: 24,
  budget: 140, week: 1, age: 0, streak: 0, traits: [], ended: false,
  memories: ['First night home']
});
let state = fresh();
let lastAction = 'welcome';
let cameraShake = 0;
let pulseColor = new THREE.Color(0x7dd3fc);

const actions = {
  meal: ['Home Meal', -12, { health: 9, mood: 4, energy: 2, stress: -2 }, 'A warm home-cooked meal steadies the week and turns the kitchen into a safe harbor.'],
  play: ['Play Time', 0, { mood: 12, social: 3, trust: 8, energy: -6, stress: -3 }, 'Shared play becomes a cinematic little adventure across the living room.'],
  study: ['Study Time', 0, { learning: 13, trust: 2, mood: -3, energy: -5, stress: 3 }, 'Practice unlocks a new spark of confidence.'],
  friends: ['Playdate', -8, { social: 13, mood: 7, energy: -5 }, 'Friend time fills the home with laughter and new stories.'],
  doctor: ['Checkup', -30, { health: 18, trust: 2, stress: 4, mood: -2 }, 'Care today prevents trouble later, even when the waiting room is tense.'],
  discipline: ['Boundary', 0, { learning: 5, mood: -6, stress: 4, trust: 1 }, 'Clear limits bring structure, even when the moment feels dramatic.'],
  work: ['Extra Shift', 45, { stress: 13, energy: -12, mood: -4, trust: -3 }, 'More income arrives, but the late-night skyline feels lonely.'],
  rest: ['Family Rest', 0, { energy: 18, stress: -14, mood: 5, health: 3 }, 'A quiet reset restores the family rhythm.']
};

const actionThemes = {
  welcome: 0x7dd3fc, meal: 0xf59e0b, play: 0x22c55e, study: 0x60a5fa,
  friends: 0xec4899, doctor: 0x38bdf8, discipline: 0xa78bfa, work: 0xf97316, rest: 0x14b8a6
};

const events = [
  ['Great Teacher Note', () => state.learning > 62, { learning: 4, mood: 7, trust: 3 }, 'A teacher notices real effort.'],
  ['New Friend', () => state.social > 62, { social: 6, mood: 6 }, 'A new friendship forms.'],
  ['Tired Week', () => state.energy < 35, { mood: -6, health: -4, stress: 7 }, 'Low energy makes everything harder.'],
  ['Money Pressure', () => state.budget < 40, { stress: 9, mood: -4 }, 'The budget feels tight.'],
  ['Family Tradition', () => state.trust > 78, { trust: 5, mood: 5, stress: -4 }, 'A small tradition becomes meaningful.'],
  ['Healthy Streak', () => state.health > 82, { energy: 5, mood: 4 }, 'Good health gives everyone momentum.']
];

function stage() {
  if (state.age < 3) return 'Baby';
  if (state.age < 6) return 'Toddler';
  if (state.age < 12) return 'Child';
  if (state.age < 16) return 'Teen';
  return 'Young Adult';
}

function addEffects(effects) {
  for (const [k, v] of Object.entries(effects)) state[k] = clamp(state[k] + v);
}

function unlockTraits() {
  const checks = [
    ['Curious', state.learning > 70], ['Well-Bonded', state.trust > 80],
    ['Outgoing', state.social > 72], ['Strong', state.health > 82],
    ['Calm Home', state.stress < 18 && state.trust > 70],
    ['Resilient', state.streak > 5 && state.energy > 55]
  ];
  let gained = '';
  for (const [name, ok] of checks) {
    if (ok && !state.traits.includes(name)) {
      state.traits.push(name);
      state.memories.unshift(`Unlocked ${name}`);
      gained = ` Trait unlocked: ${name}.`;
    }
  }
  return gained;
}

function outcome() {
  if (state.age < 18) return '';
  const score = state.mood + state.health + state.learning + state.social + state.trust - state.stress;
  if (score > 390) return 'Flourishing launch: your child enters adulthood ready, connected, and confident.';
  if (score > 310) return 'Steady launch: your child has a strong base and a clear path forward.';
  if (score > 230) return 'Mixed launch: your child has strengths, but some needs still need care.';
  return 'Hard launch: the family made it through, but the next chapter will take support.';
}

const sceneHost = $('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050816);
scene.fog = new THREE.FogExp2(0x08111f, 0.05);
const camera = new THREE.PerspectiveCamera(52, sceneHost.clientWidth / sceneHost.clientHeight, 0.1, 120);
camera.position.set(0, 3.2, 8.2);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
sceneHost.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xbfe8ff, 0x111827, 1.25); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 3.2); sun.position.set(5, 9, 4); sun.castShadow = true; scene.add(sun);
const rim = new THREE.PointLight(0x7dd3fc, 25, 14); rim.position.set(-3, 3, 3); scene.add(rim);

const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 96), new THREE.MeshStandardMaterial({ color: 0x132033, roughness: 0.55, metalness: 0.05 }));
floor.rotation.x = -Math.PI / 2; floor.position.y = -0.92; floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.TorusGeometry(4.9, 0.025, 8, 160), new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 }));
ring.rotation.x = Math.PI / 2; ring.position.y = -0.86; scene.add(ring);

const child = new THREE.Group();
const body = new THREE.Mesh(new THREE.SphereGeometry(0.85, 48, 48), new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.38, metalness: 0.08 }));
const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 48, 48), new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.42 }));
const aura = new THREE.Mesh(new THREE.SphereGeometry(1.02, 48, 48), new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending }));
head.position.y = 1.05; child.add(aura, body, head); scene.add(child);
[body, head].forEach((m) => { m.castShadow = true; });

const parent = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.35, 12, 24), new THREE.MeshStandardMaterial({ color: 0xa78bfa, roughness: 0.35, metalness: 0.1 }));
parent.position.set(-2.1, 0.18, 0); parent.castShadow = true; scene.add(parent);
const home = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.4, 1.2), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
home.position.set(2.4, -0.2, -1.8); home.castShadow = true; home.receiveShadow = true; scene.add(home);

const stars = new THREE.Points(
  new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 420 }, () => (Math.random() - 0.5) * 22), 3)),
  new THREE.PointsMaterial({ color: 0xbfe8ff, size: 0.035, transparent: true, opacity: 0.7 })
);
scene.add(stars);

const memoryRail = $('memoryRail');
function updateUI() {
  ['mood','energy','health','learning','social','trust','stress'].forEach((k) => {
    $(`${k}Value`).textContent = Math.round(state[k]);
    $(`${k}Meter`).value = Math.round(state[k]);
    $(`${k}Meter`).style.setProperty('--fill', `${Math.round(state[k])}%`);
  });
  $('stageValue').textContent = stage(); $('weekValue').textContent = state.week; $('ageValue').textContent = Math.floor(state.age); $('budgetValue').textContent = `$${Math.round(state.budget)}`;
  $('streakValue').textContent = `${state.streak} week${state.streak === 1 ? '' : 's'}`;
  $('endingValue').textContent = state.traits.length ? `Traits: ${state.traits.join(' • ')}` : 'Goal: reach age 18 with a healthy, trusted, capable child.';
  memoryRail.replaceChildren(...state.memories.slice(0, 4).map((m) => {
    const chip = document.createElement('span');
    chip.textContent = m;
    return chip;
  }));
  child.scale.setScalar(0.65 + Math.min(state.age, 18) * 0.04);
  body.material.color.setHSL(((state.mood + state.trust) / 220) * 0.35, 0.78, 0.56);
  home.scale.setScalar(0.9 + Math.max(0, state.budget) / 700);
  pulseColor.setHex(actionThemes[lastAction] || 0x7dd3fc);
  ring.material.color.copy(pulseColor); aura.material.color.copy(pulseColor); rim.color.copy(pulseColor);
}

function choose(actionKey) {
  if (state.ended) return;
  lastAction = actionKey; cameraShake = 0.32;
  const [title, cash, effects, text] = actions[actionKey];
  state.week += 1; state.age = Math.min(18, state.age + 0.22); state.budget += cash; addEffects(effects);
  const positive = Object.values(effects).filter((v) => v > 0).length;
  state.streak = positive >= 3 ? state.streak + 1 : Math.max(0, state.streak - 1);
  state.mood = clamp(state.mood - 1); state.energy = clamp(state.energy - 1); state.health = clamp(state.health - (state.budget < 0 ? 4 : 1)); state.stress = clamp(state.stress + (state.budget < 0 ? 5 : 1));
  let msg = text; let label = title;
  const ev = events.find((e) => e[1]() && Math.random() < 0.3);
  if (ev) { label = ev[0]; addEffects(ev[2]); msg += ' ' + ev[3]; }
  state.memories.unshift(`${label} · Week ${state.week}`);
  msg += unlockTraits();
  const end = outcome(); if (end) { state.ended = true; label = 'Age 18'; msg = end; $('endingValue').textContent = end; }
  $('eventTitle').textContent = label; $('eventText').textContent = msg; updateUI();
}

document.querySelectorAll('[data-action]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.action)));
$('saveBtn').addEventListener('click', () => { localStorage.setItem(saveKey, JSON.stringify(state)); $('eventTitle').textContent = 'Saved'; $('eventText').textContent = 'Game saved in this browser.'; });
$('loadBtn').addEventListener('click', () => { const s = localStorage.getItem(saveKey); if (s) { state = { ...fresh(), ...JSON.parse(s) }; $('eventTitle').textContent = 'Loaded'; $('eventText').textContent = 'Saved game loaded.'; updateUI(); } else { $('eventTitle').textContent = 'No Save'; $('eventText').textContent = 'No saved game was found.'; } });
$('newGameBtn').addEventListener('click', () => { state = fresh(); lastAction = 'welcome'; $('eventTitle').textContent = 'New Game'; $('eventText').textContent = 'A new parenting story begins.'; updateUI(); });
window.addEventListener('resize', () => { camera.aspect = sceneHost.clientWidth / sceneHost.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight); });

function animate(t) {
  requestAnimationFrame(animate);
  const time = t * 0.001;
  cameraShake *= 0.92;
  child.rotation.y = Math.sin(time) * 0.32; child.position.y = Math.sin(time * 2) * 0.08;
  parent.rotation.y = Math.sin(time * 1.2) * 0.25;
  ring.rotation.z = time * 0.18; ring.material.opacity = 0.38 + Math.sin(time * 3) * 0.16;
  aura.material.opacity = 0.1 + Math.sin(time * 4) * 0.045;
  stars.rotation.y = time * 0.018; stars.rotation.x = Math.sin(time * 0.2) * 0.04;
  camera.position.x = Math.sin(time * 0.35) * 0.28 + (Math.random() - 0.5) * cameraShake;
  camera.position.y = 3.2 + Math.sin(time * 0.5) * 0.16 + (Math.random() - 0.5) * cameraShake;
  camera.lookAt(0, 0.35, 0); renderer.render(scene, camera);
}
updateUI(); animate(0);
