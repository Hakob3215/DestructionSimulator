import * as THREE from 'three';
import { createVoxelWorld } from './src/scene.js';
import { setupPlayerControls } from './src/playerController.js';
import { createHammer } from './src/hammer.js';

// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

// Save the default camera position & rotation
const defaultCameraPosition = new THREE.Vector3(0, 10, 0);
const defaultCameraRotation = new THREE.Euler(0, 0, 0);

camera.position.copy(defaultCameraPosition);
camera.rotation.copy(defaultCameraRotation);

// Save the default player position & rotation
const defaultPlayerPosition = new THREE.Vector3(0, 10, 0);
const defaultPlayerRotation = new THREE.Euler(0, 0, 0);

//camera.lookAt(new THREE.Vector3(50, 0, 0)); 

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Create the world
createVoxelWorld(scene);

// Add camera to scene
scene.add(camera);

// Create hammer
const hammer = createHammer(scene);

// Add hammer to camera
scene.remove(hammer);
camera.add(hammer);

// Position hammer to be in hand
hammer.position.set(1.5, -1, -3);
hammer.rotation.set(0, Math.PI / 2, 0); 

// Player movement setup
const { updatePlayerMovement, yawObject: playerObject } = setupPlayerControls(camera, renderer.domElement);

// Add the playerObject (camera parent) to the scene
scene.add(playerObject);
playerObject.position.copy(defaultPlayerPosition);

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
            resetPlayer();
            break;
    }
}

function resetPlayer() {
    playerObject.position.copy(defaultPlayerPosition);
    playerObject.rotation.copy(defaultPlayerRotation);
}

animate();

renderer.render(scene, camera);
