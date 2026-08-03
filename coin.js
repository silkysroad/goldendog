/* 金狗 — the gold coin. three.js medallion struck from the logo. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

(function () {
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var plate = document.querySelector('.hero-plate');
  if (!plate) return;

  var stage = document.createElement('div');
  stage.className = 'coin-stage';
  var img = plate.querySelector('img');
  if (img) img.insertAdjacentElement('beforebegin', stage);
  else plate.prepend(stage);

  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch (e) { stage.remove(); return; }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  stage.appendChild(renderer.domElement);
  plate.classList.add('has-coin');

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 4.6);

  var pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture;

  /* key light so the relief reads even on flat env */
  var key = new THREE.DirectionalLight(0xfff2d0, 1.6);
  key.position.set(2.4, 3.2, 4);
  scene.add(key);
  var rim = new THREE.DirectionalLight(0xE2B24A, 0.9);
  rim.position.set(-3, -1.5, -2.5);
  scene.add(rim);
  scene.add(new THREE.AmbientLight(0xF4EBD8, 0.35));

  var GOLD = 0xC8921F, GOLD_DEEP = 0xA97A12;

  var goldMat = new THREE.MeshPhysicalMaterial({
    color: GOLD, metalness: 1, roughness: 0.24, envMapIntensity: 1.25,
    clearcoat: 0.4, clearcoatRoughness: 0.25
  });

  var coin = new THREE.Group();

  /* face: the logo, struck into the metal */
  var texLoader = new THREE.TextureLoader();
  var faceTex = texLoader.load('logo.png', function (t) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    /* square texture on a round cap: zoom to the circle so corners don't smear */
    t.center.set(0.5, 0.5);
    t.repeat.set(0.86, 0.86);
    t.rotation = 0;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  });
  var faceMat = new THREE.MeshPhysicalMaterial({
    map: faceTex, metalness: 0.55, roughness: 0.38, envMapIntensity: 0.9,
    clearcoat: 0.5, clearcoatRoughness: 0.3
  });

  /* reverse: 金狗 chop drawn on canvas, gold on lacquer red */
  var back = document.createElement('canvas');
  back.width = back.height = 512;
  function drawBack() {
    var c = back.getContext('2d');
    var g = c.createRadialGradient(256, 256, 40, 256, 256, 300);
    g.addColorStop(0, '#E2B24A'); g.addColorStop(0.75, '#C0891A'); g.addColorStop(1, '#8f6612');
    c.fillStyle = g; c.fillRect(0, 0, 512, 512);
    c.strokeStyle = '#8C1F23'; c.lineWidth = 10;
    c.beginPath(); c.arc(256, 256, 218, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3;
    c.beginPath(); c.arc(256, 256, 196, 0, Math.PI * 2); c.stroke();
    c.fillStyle = '#A6252A';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '900 150px "Noto Serif SC", serif';
    c.fillText('金', 256, 180);
    c.fillText('狗', 256, 336);
    backTex.needsUpdate = true;
  }
  var backTex = new THREE.CanvasTexture(back);
  backTex.colorSpace = THREE.SRGBColorSpace;
  drawBack();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(drawBack);
  var backMat = new THREE.MeshPhysicalMaterial({
    map: backTex, metalness: 0.7, roughness: 0.34, envMapIntensity: 1
  });

  /* body — axis rotated to face the camera */
  var body = new THREE.CylinderGeometry(1, 1, 0.13, 128);
  body.rotateX(Math.PI / 2);
  coin.add(new THREE.Mesh(body, [goldMat, faceMat, backMat]));

  /* rims front + back */
  var rimGeo = new THREE.TorusGeometry(0.985, 0.05, 32, 160);
  var rimF = new THREE.Mesh(rimGeo, goldMat); rimF.position.z = 0.065; coin.add(rimF);
  var rimB = new THREE.Mesh(rimGeo, goldMat); rimB.position.z = -0.065; coin.add(rimB);

  /* reeded edge — the milled ticks of a real coin */
  var tickGeo = new THREE.BoxGeometry(0.012, 0.15, 0.02);
  var tickMat = new THREE.MeshPhysicalMaterial({ color: GOLD_DEEP, metalness: 1, roughness: 0.3 });
  for (var i = 0; i < 120; i++) {
    var a = (i / 120) * Math.PI * 2;
    var tk = new THREE.Mesh(tickGeo, tickMat);
    tk.position.set(Math.cos(a) * 1.005, Math.sin(a) * 1.005, 0);
    tk.rotation.z = a + Math.PI / 2;
    tk.rotation.x = Math.PI / 2;
    coin.add(tk);
  }

  /* lay the coin flat — face up like a coin on a table, viewed from a raised angle */
  var tilt = new THREE.Group();
  tilt.rotation.x = -1.05;
  tilt.add(coin);
  scene.add(tilt);
  camera.position.set(0, 0.35, 4.5);
  camera.lookAt(0, 0, 0);

  /* pointer tilt */
  var tx = 0, ty = 0;
  window.addEventListener('pointermove', function (e) {
    var nx = (e.clientX / window.innerWidth) * 2 - 1;
    var ny = (e.clientY / window.innerHeight) * 2 - 1;
    tx = ny * 0.35; ty = nx * 0.5;
  }, { passive: true });

  function resize() {
    var w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage);

  var visible = true;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { visible = en[0].isIntersecting; }, { threshold: 0 }).observe(stage);
  }

  var clock = new THREE.Clock();
  function loop() {
    requestAnimationFrame(loop);
    if (!visible) return;
    var t = clock.getElapsedTime();
    if (!REDUCED) {
      /* spin about the face axis — a coin turning flat on the table */
      coin.rotation.z = t * 0.5;
      /* slow precession wobble + pointer influence on the lay angle */
      tilt.rotation.x = -1.05 + Math.sin(t * 0.7) * 0.06 + tx * 0.2;
      tilt.rotation.z = Math.sin(t * 0.45) * 0.05 + ty * 0.15;
      tilt.position.y = Math.sin(t * 1.1) * 0.045;
    } else {
      coin.rotation.z = -0.4;
    }
    renderer.render(scene, camera);
  }
  loop();
})();
