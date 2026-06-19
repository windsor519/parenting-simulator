import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
const clamp = (n) => Math.max(0, Math.min(100, n));
const saveKey = 'parenting-simulator-save-v2';

const fresh = () => ({
  mood: 74, energy: 72, health: 78, learning: 32, social: 38, trust: 66, stress: 24,
  budget: 140, week: 1, age: 0, traits: [], ended: false
});
let state = fresh();

const actions = {
  meal: ['Home Meal', -12, { health: 9, mood: 4, energy: 2, stress: 2 }, 'A good meal steadies the week.'],
  play: ['Play Time', 0, { mood: 12, social: 3, trust: 8, energy: -6, stress: -3 }, 'Shared play builds closeness.'],
  study: ['Study Time', 0, { learning: 13, trust: 2, mood: -3, energy: -5, stress: 3 }, 'Practice improves skills.'],
  friends: ['Playdate', -8, { social: 13, mood: 7, energy: -5 }, 'Friend time builds confidence.'],
  doctor: ['Checkup', -30, { health: 18, trust: 2, stress: 4, mood: -2 }, 'Care today prevents trouble later.'],
  discipline: ['Boundary', 0, { learning: 5, mood: -6, stress: 4, trust: 1 }, 'Clear limits bring structure.'],
  work: ['Extra Shift', 45, { stress: 13, energy: -12, mood: -4, trust: -3 }, 'More income, less time at home.'],
  rest: ['Family Rest', 0, { energy: 18, stress: -14, mood: 5, health: 3 }, 'Rest restores the family rhythm.']
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
    ['Calm Home', state.stress < 18 && state.trust > 70]
  ];
  let gained = '';
  for (const [name, ok] of checks) if (ok && !state.traits.includes(name)) { state.traits.push(name); gained = ` Trait unlocked: ${name}.`; }
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
scene.background = new THREE.Color(0x0f172a);
const camera = new THREE.PerspectiveCamera(60, sceneHost.clientWidth / sceneHost.clientHeight, 0.1, 100);
camera.position.set(0, 3.2, 8);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight);
sceneHost.appendChild(renderer.domElement);
scene.add(new THREE.AmbientLight(0xffffff, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(5, 8, 4); scene.add(sun);

const child = new THREE.Group();
const body = new THREE.Mesh(new THREE.SphereGeometry(.85,32,32), new THREE.MeshStandardMaterial({color:0x60a5fa}));
const head = new THREE.Mesh(new THREE.SphereGeometry(.46,32,32), new THREE.MeshStandardMaterial({color:0xfbbf24}));
head.position.y = 1.05; child.add(body, head); scene.add(child);
const parent = new THREE.Mesh(new THREE.CapsuleGeometry(.32,1.3,8,16), new THREE.MeshStandardMaterial({color:0xa78bfa}));
parent.position.set(-2.1,.2,0); scene.add(parent);
const floor = new THREE.Mesh(new THREE.CircleGeometry(5.4,64), new THREE.MeshStandardMaterial({color:0x1e293b}));
floor.rotation.x = -Math.PI/2; floor.position.y = -.92; scene.add(floor);
const home = new THREE.Mesh(new THREE.BoxGeometry(2.5,1.4,1.2), new THREE.MeshStandardMaterial({color:0x334155}));
home.position.set(2.4,-.2,-1.8); scene.add(home);

function updateUI() {
  ['mood','energy','health','learning','social','trust','stress'].forEach((k) => { $(`${k}Value`).textContent = Math.round(state[k]); $(`${k}Meter`).value = Math.round(state[k]); });
  $('stageValue').textContent = stage(); $('weekValue').textContent = state.week; $('ageValue').textContent = Math.floor(state.age); $('budgetValue').textContent = `$${Math.round(state.budget)}`;
  $('endingValue').textContent = state.traits.length ? `Traits: ${state.traits.join(', ')}` : 'Goal: reach age 18 with a healthy, trusted, capable child.';
  child.scale.setScalar(.65 + Math.min(state.age,18)*.04);
  body.material.color.setHSL(((state.mood + state.trust) / 220) * .35, .75, .56);
  home.scale.setScalar(.9 + Math.max(0, state.budget) / 700);
}

function choose(actionKey) {
  if (state.ended) return;
  const [title, cash, effects, text] = actions[actionKey];
  state.week += 1; state.age = Math.min(18, state.age + .22); state.budget += cash; addEffects(effects);
  state.mood = clamp(state.mood - 1); state.energy = clamp(state.energy - 1); state.health = clamp(state.health - (state.budget < 0 ? 4 : 1)); state.stress = clamp(state.stress + (state.budget < 0 ? 5 : 1));
  let msg = text; let label = title;
  const ev = events.find((e) => e[1]() && Math.random() < .3);
  if (ev) { label = ev[0]; addEffects(ev[2]); msg += ' ' + ev[3]; }
  msg += unlockTraits();
  const end = outcome(); if (end) { state.ended = true; label = 'Age 18'; msg = end; $('endingValue').textContent = end; }
  $('eventTitle').textContent = label; $('eventText').textContent = msg; updateUI();
}

document.querySelectorAll('[data-action]').forEach((b)=>b.addEventListener('click',()=>choose(b.dataset.action)));
$('saveBtn').addEventListener('click',()=>{localStorage.setItem(saveKey,JSON.stringify(state)); $('eventTitle').textContent='Saved'; $('eventText').textContent='Game saved in this browser.';});
$('loadBtn').addEventListener('click',()=>{const s=localStorage.getItem(saveKey); if(s){state={...fresh(),...JSON.parse(s)}; $('eventTitle').textContent='Loaded'; $('eventText').textContent='Saved game loaded.'; updateUI();} else {$('eventTitle').textContent='No Save'; $('eventText').textContent='No saved game was found.';}});
$('newGameBtn').addEventListener('click',()=>{state=fresh(); $('eventTitle').textContent='New Game'; $('eventText').textContent='A new parenting story begins.'; updateUI();});
window.addEventListener('resize',()=>{camera.aspect=sceneHost.clientWidth/sceneHost.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(sceneHost.clientWidth,sceneHost.clientHeight);});

function animate(t){ requestAnimationFrame(animate); child.rotation.y=Math.sin(t*.001)*.3; child.position.y=Math.sin(t*.002)*.08; parent.rotation.y=Math.sin(t*.0012)*.25; camera.lookAt(0,.35,0); renderer.render(scene,camera); }
updateUI(); animate(0);
