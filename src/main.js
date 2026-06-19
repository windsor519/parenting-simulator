import * as THREE from 'three';

const state = {
  mood: 75,
  energy: 70,
  curiosity: 45,
  trust: 60,
  budget: 120,
  day: 1,
  age: 0
};

const stageLabel = document.getElementById('stageValue');
const eventText = document.getElementById('eventText');

const sceneHost = document.getElementById('scene');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101826);

const camera = new THREE.PerspectiveCamera(60, sceneHost.clientWidth / sceneHost.clientHeight, 0.1, 100);
camera.position.set(0, 2.5, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight);
sceneHost.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(4, 8, 4);
scene.add(light);
scene.add(new THREE.AmbientLight(0xffffff, 1));

const child = new THREE.Mesh(
  new THREE.SphereGeometry(1, 32, 32),
  new THREE.MeshStandardMaterial({ color: 0x7dd3fc })
);
scene.add(child);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(4, 48),
  new THREE.MeshStandardMaterial({ color: 0x1f2937 })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.2;
scene.add(floor);

function clamp(v){ return Math.max(0, Math.min(100, v)); }

function updateUI(){
  moodValue.textContent = Math.round(state.mood);
  energyValue.textContent = Math.round(state.energy);
  curiosityValue.textContent = Math.round(state.curiosity);
  trustValue.textContent = Math.round(state.trust);
  budgetValue.textContent = '$' + Math.round(state.budget);
  dayValue.textContent = state.day;

  if(state.age < 10) stageLabel.textContent = 'Baby Stage';
  else if(state.age < 25) stageLabel.textContent = 'Child Stage';
  else stageLabel.textContent = 'Teen Stage';

  const happiness = (state.mood + state.trust) / 200;
  child.scale.setScalar(0.8 + state.age * 0.02);
  child.material.color.setHSL(happiness * 0.4, 0.8, 0.6);
}

function act(type){
  state.day += 1;
  state.age += 0.5;

  const effects = {
    feed:[10,5,0,3,-10,'Healthy meal shared together.'],
    play:[15,-8,8,6,-5,'A fun day of play and laughter.'],
    teach:[-2,-5,15,4,-3,'Learning sparks curiosity.'],
    comfort:[8,-3,0,12,0,'You listened and provided support.'],
    work:[-5,-10,0,-4,25,'You focused on earning income.'],
    sleep:[6,18,0,2,0,'Everyone got some rest.']
  };

  const [m,e,c,t,b,msg] = effects[type];
  state.mood = clamp(state.mood + m - 2);
  state.energy = clamp(state.energy + e - 3);
  state.curiosity = clamp(state.curiosity + c);
  state.trust = clamp(state.trust + t);
  state.budget += b;

  eventText.textContent = msg;
  updateUI();
}

document.querySelectorAll('[data-action]').forEach(btn=>{
  btn.addEventListener('click',()=>act(btn.dataset.action));
});

window.addEventListener('resize',()=>{
  camera.aspect = sceneHost.clientWidth / sceneHost.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(sceneHost.clientWidth, sceneHost.clientHeight);
});

function animate(){
  requestAnimationFrame(animate);
  child.rotation.y += 0.01;
  child.position.y = Math.sin(performance.now()*0.002)*0.15;
  renderer.render(scene,camera);
}

updateUI();
animate();