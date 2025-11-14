import * as THREE from 'three';
import { createVoxelWorld } from './src/scene.js';
import { setupPlayerControls } from './src/PlayerControl.js';

// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Save the default camera position & rotation
const defaultCameraPosition = new THREE.Vector3(0, 10, 0);
const defaultCameraRotation = new THREE.Euler(0, 0, 0);

camera.position.copy(defaultCameraPosition);
camera.rotation.copy(defaultCameraRotation);

//camera.lookAt(new THREE.Vector3(50, 0, 0)); 

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Create the world
createVoxelWorld(scene);

// Player movement setup
const { updatePlayerMovement, yawObject } = setupPlayerControls(camera, renderer.domElement);

// Add the yawObject (camera parent) to the scene
scene.add(yawObject);

// Animation loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

	const time = clock.getDelta();
	updatePlayerMovement(time);

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handle keyboard input
document.addEventListener('keydown', onKeyDown, false);

function onKeyDown(event) {
    switch (event.key) {
        case '0': // Reset camera
            resetCamera();
            break;
    }
}

function resetCamera() {
    camera.position.copy(defaultCameraPosition);
    camera.rotation.copy(defaultCameraRotation);
}

animate();

renderer.render(scene, camera);
