// ----- Imports -----
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

// ----- DOM Refs -----
const container = document.getElementById('canvas-container');
const statStars = document.getElementById('stat-stars');
const statArms = document.getElementById('stat-arms');
const statSpin = document.getElementById('stat-spin');
const statType = document.getElementById('stat-type');
const statFps = document.getElementById('stat-fps');

// ----- Scene Setup -----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070a);

// ----- Camera -----
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(10, 5, 15);
camera.lookAt(0, 0, 0);

// ----- Renderer -----
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// ----- Post Processing (Bloom) -----
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.6,   // Strength
    0.4,   // Radius
    0.85   // Threshold
);
composer.addPass(bloomPass);

// ----- Galaxy Group -----
let galaxyGroup = new THREE.Group();
scene.add(galaxyGroup);

// ----- Background: Distant Starfield (Static) -----
function createStarfield() {
    const geo = new THREE.BufferGeometry();
    const count = 8000;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
        // Spread in a large sphere radius 60-80
        const r = 50 + Math.random() * 40;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        positions[i] = Math.sin(phi) * Math.cos(theta) * r;
        positions[++i] = Math.sin(phi) * Math.sin(theta) * r;
        positions[++i] = Math.cos(phi) * r;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
    });
    const stars = new THREE.Points(geo, mat);
    scene.add(stars);
    return stars;
}
const starfield = createStarfield();

// ----- Background: Nebula Clouds (Big sprites) -----
function createNebula() {
    const group = new THREE.Group();
    // Create canvas texture for a soft cloud
    function createNebulaTexture(color1, color2) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(0.4, color2);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(canvas);
    }

    const colors = [
        { c1: 'rgba(100, 50, 200, 0.8)', c2: 'rgba(200, 50, 150, 0.3)' },
        { c1: 'rgba(20, 100, 200, 0.7)', c2: 'rgba(50, 200, 200, 0.2)' },
        { c1: 'rgba(200, 100, 50, 0.6)', c2: 'rgba(200, 50, 50, 0.2)' },
    ];

    colors.forEach((c, i) => {
        const tex = createNebulaTexture(c.c1, c.c2);
        const mat = new THREE.SpriteMaterial({
            map: tex,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0.4,
            rotation: Math.random() * Math.PI,
        });
        const sprite = new THREE.Sprite(mat);
        const r = 20 + Math.random() * 25;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        sprite.position.set(
            Math.sin(phi) * Math.cos(theta) * r,
            Math.sin(phi) * Math.sin(theta) * r * 0.4,
            Math.cos(phi) * r
        );
        sprite.scale.set(30 + Math.random() * 40, 30 + Math.random() * 40, 1);
        group.add(sprite);
    });
    scene.add(group);
    return group;
}
const nebula = createNebula();

// ----- Mouse Tracking -----
const mouse = { x: 0, y: 0 };
let targetRotX = 0, targetRotY = 0;
let currentRotX = 0, currentRotY = 0;

document.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    targetRotX = mouse.y * 0.4;
    targetRotY = mouse.x * 0.6;
});

// ----- Click to Generate -----
document.addEventListener('click', generateGalaxy);

// ----- FPS Counter -----
let frameCount = 0;
let lastFpsUpdate = performance.now();

// ----- Galaxy Generation Logic -----
function generateGalaxy() {
    // Clear old
    while (galaxyGroup.children.length > 0) {
        const child = galaxyGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        galaxyGroup.remove(child);
    }

    // ----- PARAMETERS (Random) -----
    const params = {
        count: Math.floor(15000 + Math.random() * 25000),
        arms: 2 + Math.floor(Math.random() * 4),
        radius: 3 + Math.random() * 5,
        spin: 1 + Math.random() * 3.5,
        randomness: 0.2 + Math.random() * 0.6,
        coreSize: 0.5 + Math.random() * 0.8,
        colorCenter: new THREE.Color().setHSL(0.08 + Math.random() * 0.08, 0.9, 0.6),
        colorEdge: new THREE.Color().setHSL(0.55 + Math.random() * 0.35, 0.9, 0.5),
    };

    // Determine Galaxy Type based on arms and spin
    let type = 'Spiral (Sa)';
    if (params.arms >= 4) type = 'Grand Design (Sc)';
    else if (params.arms === 3) type = 'Three-Armed (Sb)';
    else if (params.spin > 3) type = 'Tight Spiral (Sa)';
    else type = 'Loose Spiral (Sc)';
    if (params.count < 12000) type = 'Dwarf Spiral';

    // Update Stats HUD
    statStars.textContent = params.count.toLocaleString();
    statArms.textContent = params.arms;
    statSpin.textContent = params.spin.toFixed(2);
    statType.textContent = type;

    // Update Legend gradient dynamically
    const c1 = params.colorCenter.clone().multiplyScalar(1.5).getStyle();
    const c2 = params.colorEdge.clone().multiplyScalar(1.5).getStyle();
    document.getElementById('legend-bar').style.background =
        `linear-gradient(90deg, ${c1}, ${c2})`;

    // ----- Build Geometry -----
    const positions = new Float32Array(params.count * 3);
    const colors = new Float32Array(params.count * 3);

    for (let i = 0; i < params.count; i++) {
        const armIdx = i % params.arms;
        const armAngle = (armIdx / params.arms) * Math.PI * 2;
        const r = Math.pow(Math.random(), 1.5) * params.radius;
        const spinAngle = r * 0.5 * params.spin;

        const randX = (Math.random() - 0.5) * params.randomness * (r * 0.8 + 0.5);
        const randY = (Math.random() - 0.5) * params.randomness * (r * 0.4 + 0.3);
        const randZ = (Math.random() - 0.5) * params.randomness * (r * 0.8 + 0.5);

        const angle = spinAngle + armAngle;
        const x = Math.cos(angle) * r + randX;
        const y = randY * 0.6;
        const z = Math.sin(angle) * r + randZ;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const mix = Math.min(r / params.radius, 1);
        const color = params.colorCenter.clone().lerp(params.colorEdge, mix);
        const bright = 0.7 + Math.random() * 0.5;
        colors[i * 3] = color.r * bright;
        colors[i * 3 + 1] = color.g * bright;
        colors[i * 3 + 2] = color.b * bright;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Particle Texture
    function createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64;
        const ctx = canvas.getContext('2d');
        const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,255,255,1)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.9)');
        grad.addColorStop(0.7, 'rgba(200,200,255,0.4)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(canvas);
    }

    const material = new THREE.PointsMaterial({
        size: 0.09,
        map: createParticleTexture(),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true,
        opacity: 0.95,
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    galaxyGroup.add(points);

    // Core Glow (extra bright center)
    const coreGeo = new THREE.BufferGeometry();
    const corePos = new Float32Array(1500 * 3);
    for (let i = 0; i < 1500; i++) {
        const r = Math.pow(Math.random(), 2) * params.coreSize;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        corePos[i * 3] = Math.sin(theta) * Math.cos(phi) * r;
        corePos[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * r * 0.3;
        corePos[i * 3 + 2] = Math.cos(theta) * r;
    }
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    const coreMat = new THREE.PointsMaterial({
        size: 0.06,
        color: 0xffeedd,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
    });
    const corePoints = new THREE.Points(coreGeo, coreMat);
    galaxyGroup.add(corePoints);

    // Reset rotation
    galaxyGroup.rotation.x = 0;
    galaxyGroup.rotation.y = 0;
    currentRotX = 0; currentRotY = 0;
    targetRotX = 0; targetRotY = 0;
}

// ----- Resize -----
window.addEventListener('resize', () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    composer.setSize(w, h);
});

// ----- Animation Loop -----
function animate() {
    requestAnimationFrame(animate);

    // Smooth mouse rotation
    currentRotX += (targetRotX - currentRotX) * 0.05;
    currentRotY += (targetRotY - currentRotY) * 0.05;
    galaxyGroup.rotation.x = currentRotX * 0.5;
    galaxyGroup.rotation.y = currentRotY * 0.8;

    // Auto spin
    galaxyGroup.rotation.y += 0.0006;

    // Rotate background starfield slowly (parallax)
    starfield.rotation.y += 0.0001;
    nebula.rotation.y += 0.00005;

    // Render via composer (Bloom)
    composer.render();

    // FPS Counter
    frameCount++;
    const now = performance.now();
    if (now - lastFpsUpdate > 1000) {
        statFps.textContent = frameCount;
        frameCount = 0;
        lastFpsUpdate = now;
    }
}

// ----- Generate First & Start -----
generateGalaxy();
animate();

// ----- Fade out instruction after 5 seconds -----
setTimeout(() => {
    const inst = document.getElementById('instruction');
    if (inst) inst.style.opacity = '0';
}, 5000);

console.log('🌀 Galactic Forge loaded! Click anywhere to create a new universe.');
