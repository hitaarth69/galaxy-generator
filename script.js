// ----- Imports -----
import * as THREE from 'three';

// ----- DOM Reference -----
const container = document.getElementById('canvas-container');

// ----- Scene Setup -----
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);

// ----- Camera -----
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(8, 4, 12);
camera.lookAt(0, 0, 0);

// ----- Renderer -----
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
container.appendChild(renderer.domElement);

// ----- Galaxy Group (will hold all particles) -----
let galaxyGroup = new THREE.Group();
scene.add(galaxyGroup);

// ----- Mouse Tracking (for rotation) -----
const mouse = { x: 0, y: 0 };
let targetRotationX = 0;
let targetRotationY = 0;
let currentRotationX = 0;
let currentRotationY = 0;

document.addEventListener('mousemove', (event) => {
    // Normalize mouse coordinates to -1 .. 1
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    targetRotationX = mouse.y * 0.5;
    targetRotationY = mouse.x * 0.8;
});

// ----- Click to Regenerate -----
document.addEventListener('click', generateGalaxy);

// ----- Generate Galaxy Function -----
function generateGalaxy() {
    // Remove old galaxy
    while (galaxyGroup.children.length > 0) {
        const child = galaxyGroup.children[0];
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
        galaxyGroup.remove(child);
    }

    // ----- Random Parameters -----
    const parameters = {
        count: 15000 + Math.floor(Math.random() * 15000),
        arms: 2 + Math.floor(Math.random() * 4),        // 2 to 5 arms
        radius: 4 + Math.random() * 4,                  // 4 to 8
        spin: 1 + Math.random() * 3,                    // 1 to 4
        randomness: 0.2 + Math.random() * 0.5,          // 0.2 to 0.7
        coreSize: 0.5 + Math.random() * 0.8,
        colorCenter: new THREE.Color().setHSL(0.1 + Math.random() * 0.1, 0.8, 0.6), // warm
        colorEdge: new THREE.Color().setHSL(0.6 + Math.random() * 0.3, 0.9, 0.5),   // cool
    };

    // ----- Geometry -----
    const positions = new Float32Array(parameters.count * 3);
    const colors = new Float32Array(parameters.count * 3);

    const colorCenter = parameters.colorCenter;
    const colorEdge = parameters.colorEdge;

    for (let i = 0; i < parameters.count; i++) {
        // Spiral math
        const armIndex = i % parameters.arms;
        const armAngleOffset = (armIndex / parameters.arms) * Math.PI * 2;

        // Radius distribution (more particles near center)
        const r = Math.pow(Math.random(), 1.5) * parameters.radius;
        const spinAngle = r * 0.5 * parameters.spin;

        // Randomness (scatter)
        const randomX = (Math.random() - 0.5) * parameters.randomness * (r * 0.8 + 0.5);
        const randomY = (Math.random() - 0.5) * parameters.randomness * (r * 0.4 + 0.3);
        const randomZ = (Math.random() - 0.5) * parameters.randomness * (r * 0.8 + 0.5);

        // Position
        const angle = spinAngle + armAngleOffset;
        const x = Math.cos(angle) * r + randomX;
        const y = randomY * 0.6;
        const z = Math.sin(angle) * r + randomZ;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Color (interpolate between center and edge based on distance)
        const mixFactor = Math.min(r / parameters.radius, 1);
        const color = colorCenter.clone().lerp(colorEdge, mixFactor);

        // Add some random brightness variation
        const brightness = 0.7 + Math.random() * 0.5;
        colors[i * 3] = color.r * brightness;
        colors[i * 3 + 1] = color.g * brightness;
        colors[i * 3 + 2] = color.b * brightness;
    }

    // ----- Build Geometry -----
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // ----- Generate a soft circular particle texture -----
    function createParticleTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
        gradient.addColorStop(0, 'rgba(255,255,255,1)');
        gradient.addColorStop(0.3, 'rgba(255,255,255,0.9)');
        gradient.addColorStop(0.7, 'rgba(200,200,255,0.5)');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 64);

        return new THREE.CanvasTexture(canvas);
    }

    const particleTexture = createParticleTexture();

    // ----- Material -----
    const material = new THREE.PointsMaterial({
        size: 0.08,
        map: particleTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        vertexColors: true,
        opacity: 0.95,
        sizeAttenuation: true,
    });

    // ----- Create Points -----
    const points = new THREE.Points(geometry, material);
    galaxyGroup.add(points);

    // Add a subtle central glow (smaller, brighter core)
    const coreGeometry = new THREE.BufferGeometry();
    const corePositions = new Float32Array(1000 * 3);
    for (let i = 0; i < 1000; i++) {
        const r = Math.pow(Math.random(), 2) * parameters.coreSize;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI * 2;
        corePositions[i * 3] = Math.sin(theta) * Math.cos(phi) * r;
        corePositions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * r * 0.3;
        corePositions[i * 3 + 2] = Math.cos(theta) * r;
    }
    coreGeometry.setAttribute('position', new THREE.BufferAttribute(corePositions, 3));

    const coreMaterial = new THREE.PointsMaterial({
        size: 0.05,
        color: 0xffeedd,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true,
    });
    const corePoints = new THREE.Points(coreGeometry, coreMaterial);
    galaxyGroup.add(corePoints);

    // Reset rotation for the new galaxy
    galaxyGroup.rotation.x = 0;
    galaxyGroup.rotation.y = 0;
    currentRotationX = 0;
    currentRotationY = 0;
    targetRotationX = 0;
    targetRotationY = 0;
}

// ----- Window Resize Handling -----
function onResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}
window.addEventListener('resize', onResize);

// ----- Animation Loop -----
function animate() {
    requestAnimationFrame(animate);

    // Smooth rotation following mouse
    currentRotationX += (targetRotationX - currentRotationX) * 0.05;
    currentRotationY += (targetRotationY - currentRotationY) * 0.05;

    galaxyGroup.rotation.x = currentRotationX * 0.5;
    galaxyGroup.rotation.y = currentRotationY * 0.8;

    // Slow auto-rotation (makes it feel alive)
    galaxyGroup.rotation.y += 0.0008;

    renderer.render(scene, camera);
}

// ----- Generate First Galaxy & Start -----
generateGalaxy();
animate();

// ----- Small console greeting -----
console.log('🌀 Infinite Galaxy Generator');
console.log('Move your mouse to explore • Click to generate a new galaxy!');
