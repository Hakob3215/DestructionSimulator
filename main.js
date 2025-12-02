import * as THREE from 'three';
import { createVoxelWorld } from './src/scene.js';
import { setupPlayerControls } from './src/Player/playerController.js';
import { createHammer } from './src/Weapons/hammer.js';
import { createCartoonBomb } from './src/Weapons/grenade.js';
import { createDynamite } from './src/Weapons/grenade.js';
import { menuState, createMenu, createButton, showMenu, hideAllMenus } from './src/userInterface.js';

// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();

// Chnages skybox color to sky blue
scene.background = new THREE.Color(0x87CEEB);

// Creates the menus
const mainMenu = createMenu("rgba(204, 155, 114, 0.9)", "column");
const levelMenu = createMenu("rgba(92, 141, 197, 0.9)", "row");

document.body.appendChild(mainMenu);
document.body.appendChild(levelMenu);


// Adds buttons to the menus
mainMenu.appendChild(createButton("Play", () => hideAllMenus(renderer.domElement)));
mainMenu.appendChild(createButton("Levels", () => showMenu(levelMenu)));

levelMenu.appendChild(createButton("Level 1", () => console.log("Level 1 Selected!")));
levelMenu.appendChild(createButton("Level 2", () => console.log("Level 2 Selected!")));
levelMenu.appendChild(createButton("Level 3", () => console.log("Level 3 Selected!")));

// Save the default camera position & rotation
const defaultCameraPosition = new THREE.Vector3(0, 4, 10);
const defaultCameraRotation = new THREE.Euler(0, 0, 0);

camera.position.copy(defaultCameraPosition);
camera.rotation.copy(defaultCameraRotation);

// Attaches audio listener to camera
camera.add(listener);

// Save the default player position & rotation
const defaultPlayerPosition = new THREE.Vector3(0, 4, 10);
const defaultPlayerRotation = new THREE.Euler(0, 0, 0);

//camera.lookAt(new THREE.Vector3(50, 0, 0)); 

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

// Create the world
let worldGroup = createVoxelWorld((count) => {
    totalVoxels = count;
    destroyedVoxels = 0;
    updateDestructionMeter();
});
scene.add(worldGroup);

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

// put grenade in leftHand
const leftHand = new THREE.Group();
camera.add(leftHand);

// Position the grenade hand relative to the camera (adjust as needed)
leftHand.position.set(-1.2, -1, -3);
leftHand.rotation.set(0, 0, 0);

// Create grenade (choose one)
//const grenade = createCartoonBomb();
const grenade = createDynamite();

leftHand.add(grenade);

// Adjust grenade position inside the hand
grenade.position.set(0, 0, 0);
grenade.rotation.set(0, 0, 0);
grenade.scale.set(0.4, 0.4, 0.4);

// Hammer swing animation variables
let isSwinging = false;
const swingDuration = 0.3; // seconds
let swingTimer = 0;

// List to store active explosion effects
const activeExplosions = [];

// Destruction Meter Variables
let totalVoxels = 0;
let destroyedVoxels = 0;

function updateDestructionMeter() {
    const bar = document.getElementById('destruction-bar');
    const text = document.getElementById('destruction-text');
    if (bar && text && totalVoxels > 0) {
        const percent = Math.min(100, Math.max(0, (destroyedVoxels / totalVoxels) * 100));
        bar.style.width = percent + '%';
        text.innerText = `Destruction: ${Math.round(percent)}%`;
    } else if (bar && text && totalVoxels === 0) {
        bar.style.width = '0%';
        text.innerText = `Destruction: 0%`;
    }
}

// Player movement setup
const { updatePlayerMovement, playerObject, playerBox, playerBoxSize } = setupPlayerControls(camera, renderer.domElement);

// Add the playerObject (camera parent) to the scene
scene.add(playerObject);
// No need to copy position again as setupPlayerControls already did it based on camera's initial position

// Helper to see hitbox of the Player
const playerHelper = new THREE.Box3Helper(playerBox, 0x00ff00);
scene.add(playerHelper);

// Loads sound files
// SFX for swinging hammer
const hammerSwingSound = new THREE.Audio(listener);
audioLoader.load('./src/Audio/SFX/hammerSwing.mp3', function( buffer ) {
    hammerSwingSound.setBuffer(buffer);
    hammerSwingSound.setLoop(false);
    hammerSwingSound.setVolume(1.0);
});
// SFX for hitting stone object
const rockSmashSound = new THREE.Audio(listener);
audioLoader.load('./src/Audio/SFX/rockSmash.mp3', function( buffer ) {
    rockSmashSound.setBuffer(buffer);
    rockSmashSound.setLoop(false);
    rockSmashSound.setVolume(1.0);
});
// Grenade Throw SFX
const grenadeThrowSound = new THREE.Audio(listener);
audioLoader.load('./src/Audio/SFX/throw.mp3', function( buffer ) {
    grenadeThrowSound.setBuffer(buffer);
    grenadeThrowSound.setLoop(false);
    grenadeThrowSound.setVolume(1.0);
});
// Fuse burn SFX
let fuseBurnBuffer = null;
audioLoader.load('./src/Audio/SFX/fuseBurn.mp3', buffer => {
    fuseBurnBuffer = buffer;
});
// Explosion SFX
let explosionBuffer = null;
audioLoader.load('./src/Audio/SFX/explosion.wav', buffer => {
    explosionBuffer = buffer;
});

// Animation loop
const clock = new THREE.Clock();
function animate() {
    requestAnimationFrame(animate);

	const time = clock.getDelta();
    
    // Pass checkCollisions as a callback to allow axis-independent collision resolution (wall sliding)
	updatePlayerMovement(time, checkCollisions);

    updatePhysics(time); // Update physics for hit objects

    // Update hammer swing animation
    if (isSwinging) {
        swingTimer += time;
        const swingProgress = Math.min(swingTimer / swingDuration, 1);

        // Simple swing animation: move forward and back
        const swingAngle = Math.sin(swingProgress * Math.PI) * -Math.PI / 2;
        hammer.rotation.z = swingAngle;

        // Check for hammer collision at the peak of the swing
        if (swingProgress > 0.3 && swingProgress < 0.7) {
             checkHammerCollisions();
        }

        if (swingProgress >= 1) {
            isSwinging = false;
            swingTimer = 0;
            hammer.rotation.z = 0; // Reset rotation
        }
    }

    // Update helper because its moving
    playerHelper.box.copy(playerBox);
    playerHelper.updateMatrixWorld(true);
    
    for (const update of activeExplosions) {
        update(time);
    }

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handle mouse click for grenade throw
document.addEventListener("mousedown", (e) => {
    if (e.button === 2) {  // Right Click
        throwGrenade();
    }
});

// Handle mouse click for hammer swing
document.addEventListener('mousedown', (e) => {
    if (e.button === 0) { // LEFT CLICK ONLY
        if (!isSwinging) {
            isSwinging = true;
            hammerSwingSound.clone(true).play();
        }
    }
});

// Handle keyboard input
document.addEventListener('keydown', onKeyDown, false);

function onKeyDown(event) { 
    switch (event.key) {
        case '0': // Reset Scene
            resetScene();
            break;
    }
}

// Handle keyboard input for menu
document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "m") {
        if (!menuState.mainMenuUp) {
            if (document.pointerLockElement) {
                document.exitPointerLock();
            }
            showMenu(mainMenu);
            menuState.mainMenuUp = true;
        } else {
            if (!document.pointerLockElement) {
                renderer.domElement.requestPointerLock();
            }
            hideAllMenus(renderer.domElement);
            menuState.mainMenuUp = false
        }
    }
});

function playExplosionSoundAt(position) {
    if (!explosionBuffer) return; // buffer not ready yet

    const sound = new THREE.PositionalAudio(listener);
    sound.setBuffer(explosionBuffer);
    sound.setRefDistance(6);    // distance before volume of sound starts decreasing
    sound.setVolume(0.25);

    sound.position.copy(position);
    scene.add(sound);

    sound.play();

    sound.onEnded = () => {
        sound.stop();
        sound.disconnect();     // detach audio nodes
        scene.remove(sound);    // remove from scene
    };
}

// Explosion Effect variables
const explosionLightIntensity = 8;
const explosionEffectRadius = 5;  
const explosionEffectDuration = 0.3;
const castShadows = false;  // Currently false to reduce lag from many explosions (can change later)

// Pre-allocate geometry to reduce GC
const sharedExplosionGeometry = new THREE.SphereGeometry(1, 32, 32);
// Template material to force shader compilation
const sharedExplosionMaterial = new THREE.MeshStandardMaterial({
    color: 0xff5500,
    emissive: 0xff2200,
    emissiveIntensity: 2,
    transparent: true,
    opacity: 1
});

// Warm up the renderer with a dummy explosion object
// This forces the shader for transparent emissive objects to compile immediately
const dummyExplosion = new THREE.Mesh(sharedExplosionGeometry, sharedExplosionMaterial);
dummyExplosion.position.set(0, -1000, 0); // Hide it
dummyExplosion.frustumCulled = false; // Force it to be "rendered" even if off-screen (though Three.js might still cull it)
scene.add(dummyExplosion);

function createExplosionEffect(position) {
    // ---------- Explosion Sphere ----------
    // Clone material so we can fade opacity independently
    const sphereMaterial = sharedExplosionMaterial.clone();

    const explosionSphere = new THREE.Mesh(sharedExplosionGeometry, sphereMaterial);
    explosionSphere.position.copy(position);
    scene.add(explosionSphere);

    // ---------- Explosion Light ----------
    // const explosionLight = new THREE.PointLight(0xffaa55, explosionLightIntensity, 20);
    // explosionLight.castShadow = castShadows; 
    // //explosionLight.shadow.mapSize.width = 256;
    // //explosionLight.shadow.mapSize.height = 256;
    // explosionLight.position.copy(position);
    // scene.add(explosionLight);

    // ---------- Animation state ----------
    let elapsed = 0;

    // ---------- Update Explosion ----------
    function updateExplosionEffect(deltaTime) {
        elapsed += deltaTime;

        const t = elapsed / explosionEffectDuration;

        if (t >= 1) {
            // Cleanup
            scene.remove(explosionSphere);
            // Do NOT dispose geometry as it is shared
            // explosionSphere.geometry.dispose(); 
            explosionSphere.material.dispose();

            // scene.remove(explosionLight);

            activeExplosions.splice(activeExplosions.indexOf(updateExplosionEffect), 1);
            return;
        }

        // Scale sphere
        const scale = 1 + t * explosionEffectRadius;
        explosionSphere.scale.set(scale, scale, scale);

        // Fade opacity
        explosionSphere.material.opacity = 1 - t;

        // Light fade
        // explosionLight.intensity = explosionLightIntensity * (1 - t);
    }

    // Register explosion for animation loop
    activeExplosions.push(updateExplosionEffect);
}

// Explosion Variables
const grenadeExplosionForce = 75.0;
const grenadeExplosionRadius = 5.0
const hammerExplosionForce = 15.0;
const hammerExplosionRadius = 2.0;



function throwGrenade() {
    // Clone grenade model (keep original in hand)
    const thrown = grenade.clone(true);

    // Ensure materials are cloned so transparency & animation work independently
    thrown.traverse(obj => {
        if (obj.isMesh) {
            obj.material = obj.material.clone();
        }
    });

    if (fuseBurnBuffer) {
        const fuseBurnSound = new THREE.PositionalAudio(listener);
        fuseBurnSound.setBuffer(fuseBurnBuffer);
        fuseBurnSound.setRefDistance(4);  // how far until volume decreases
        fuseBurnSound.setLoop(false);
        fuseBurnSound.setVolume(1.0);

        thrown.add(fuseBurnSound);
        fuseBurnSound.play();
        
        // Optional: save reference for stopping later on explosion
        thrown.userData.fuseSound = fuseBurnSound;
    }

    // Add to scene
    scene.add(thrown);

    // Plays throw sounds
    grenadeThrowSound.clone(true).play();

    // Position grenade at camera hand position
    const worldPos = new THREE.Vector3();
    leftHand.getWorldPosition(worldPos);
    thrown.position.copy(worldPos);

    // Face same direction as camera
    thrown.quaternion.copy(camera.quaternion);

    // Initialize physics properties
    thrown.userData.boundingBox = new THREE.Box3().setFromObject(thrown);
    thrown.userData.isHit = true;               // so static list ignores it
    thrown.userData.velocity = new THREE.Vector3();
    thrown.userData.angularVelocity = new THREE.Vector3();
    thrown.userData.life = 4.0;                // grenade lasts for 4 seconds
    thrown.userData.isGrenade = true;

    // Apply forward throw impulse
    const throwForce = 25;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);  // Get world-space forward
    thrown.userData.velocity.copy(forward.multiplyScalar(throwForce));

    // Add slight upward arc
    thrown.userData.velocity.y += 8;

    // Add random spin
    thrown.userData.angularVelocity.set(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
    );

    // Register into physics engine
    if (!scene.userData.physicsObjects) scene.userData.physicsObjects = [];
    scene.userData.physicsObjects.push(thrown);
}

function checkHammerCollisions() {
    // Create a raycaster from the camera position in the direction the camera is facing
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 5; // Reach of the hammer

    const intersects = raycaster.intersectObjects(scene.children);

    for (let i = 0; i < intersects.length; i++) {
        const intersection = intersects[i];
        const object = intersection.object;

        // Check for InstancedMesh (Static World)
        if (object.isInstancedMesh) {
            const instanceId = intersection.instanceId;
            if (instanceId !== undefined) {
                // Get position of the hit instance
                const matrix = new THREE.Matrix4();
                object.getMatrixAt(instanceId, matrix);
                const position = new THREE.Vector3().setFromMatrixPosition(matrix);

                console.log("Hammer hit voxel!");
                triggerExplosion(position, hammerExplosionForce, hammerExplosionRadius);
                rockSmashSound.clone(true).play();
                break;
            }
        }
        
        // Check for Dynamic Objects (Debris)
        if (object.userData.boundingBox && !object.userData.isHit) {
            console.log("Hammer hit debris!");
            triggerExplosion(object.position, hammerExplosionForce, hammerExplosionRadius);
            rockSmashSound.clone(true).play();
            break; 
        }
    }
}

function applyPhysicsToVoxel(voxel) {
    voxel.userData.isHit = true;
    voxel.userData.velocity = new THREE.Vector3(0, 0, 0);
    voxel.userData.angularVelocity = new THREE.Vector3(0, 0, 0);
    voxel.userData.life = 5.0; // Seconds before disappearing
    
    // Add to a list of active physics objects to update in the loop
    if (!scene.userData.physicsObjects) {
        scene.userData.physicsObjects = [];
    }
    scene.userData.physicsObjects.push(voxel);

    // OPTIMIZATION: Do NOT search and remove from staticVoxels here.
    // The caller (triggerExplosion) is responsible for removing it from the static list.
    // This avoids an O(N) linear scan for every single block, which causes massive lag.
}

function updatePhysics(time) {
    // Initialize physics objects list if not exists
    if (!scene.userData.physicsObjects) {
        scene.userData.physicsObjects = [];
    }

    if (scene.userData.physicsObjects.length === 0) return;

    const gravity = new THREE.Vector3(0, -20, 0);
    const floorY = 0.5; // Assuming cubes are size 1 and floor is at 0
    const voxelMap = worldGroup.userData.voxelMap;

    for (let i = scene.userData.physicsObjects.length - 1; i >= 0; i--) {
        const obj = scene.userData.physicsObjects[i];
        
        // Update lifetime
        if (obj.userData.life !== undefined) {
            obj.userData.life -= time;
            if (obj.userData.life <= 0) {
                // Remove from scene and trigger explosion of grenade
                if (obj.userData.isGrenade) {
                    triggerExplosion(obj.position, grenadeExplosionForce, grenadeExplosionRadius);
                    createExplosionEffect(obj.position);
                    playExplosionSoundAt(obj.position);
                    obj.userData.fuseSound.stop();
                    obj.userData.fuseSound.disconnect();
                }

                // Remove from scene and physics list
                if (obj.parent) {
                    obj.parent.remove(obj);
                }
                scene.userData.physicsObjects.splice(i, 1);
                continue;
            }
        }

        // Apply gravity
        obj.userData.velocity.add(gravity.clone().multiplyScalar(time));
        
        // Update position
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(time));
        
        // Update rotation
        obj.userData.angularVelocity.multiplyScalar(0.98); 
        
        obj.rotation.x += obj.userData.angularVelocity.x * time;
        obj.rotation.y += obj.userData.angularVelocity.y * time;
        obj.rotation.z += obj.userData.angularVelocity.z * time;

        // Simple floor collision
        if (obj.position.y < floorY) {
            obj.position.y = floorY;
            obj.userData.velocity.y *= -0.5; // Bounce with damping
            obj.userData.velocity.x *= 0.8; // Friction
            obj.userData.velocity.z *= 0.8; // Friction
            
            // Stop if slow enough
            if (obj.userData.velocity.lengthSq() < 0.1) {
                obj.userData.velocity.set(0,0,0);
                obj.userData.angularVelocity.set(0,0,0);
            }
        }
        
        // Update bounding box
        if (obj.userData.boundingBox) {
             obj.userData.boundingBox.setFromObject(obj);
        }

        // Check collision with Static World (InstancedMesh)
        if (voxelMap) {
            // Check the voxel at the object's position
            const checkX = Math.round(obj.position.x);
            const checkY = Math.floor(obj.position.y);
            const checkZ = Math.round(obj.position.z);
            const key = `${checkX},${checkY + 0.5},${checkZ}`;

            if (voxelMap.has(key)) {
                // Collision with static voxel!
                
                if (obj.userData.isGrenade) {
                    triggerExplosion(obj.position, grenadeExplosionForce, grenadeExplosionRadius);
                    createExplosionEffect(obj.position);
                    playExplosionSoundAt(obj.position);
                    obj.userData.fuseSound.stop();
                    obj.userData.fuseSound.disconnect();
                    if (obj.parent) obj.parent.remove(obj);
                    scene.userData.physicsObjects.splice(i, 1);
                    continue;
                }

                // Simple bounce
                const impactSpeed = obj.userData.velocity.length();
                const minImpactSpeed = 20.0;

                if (impactSpeed >= minImpactSpeed) {
                    // Destroy the static voxel
                    const instanceId = voxelMap.get(key);
                    destroyVoxel(instanceId, checkX, checkY + 0.5, checkZ, obj.position, impactSpeed * 0.1, 1.2);
                    voxelMap.delete(key);
                    
                    // Reflect
                    obj.userData.velocity.multiplyScalar(-0.5);
                } else {
                    // Just bounce
                    // Determine normal based on previous position? 
                    // Simplified: just reverse velocity and push out
                    obj.userData.velocity.multiplyScalar(-0.5);
                    
                    // Push out towards previous position (approximate)
                    const pushDir = obj.userData.velocity.clone().normalize().negate();
                    if (pushDir.lengthSq() === 0) pushDir.set(0,1,0);
                    obj.position.add(pushDir.multiplyScalar(0.5));
                }
            }
        }
    }

    // Check for collisions between physics objects (Dynamic-Dynamic)
    // This prevents them from overlapping on the floor
    for (let i = 0; i < scene.userData.physicsObjects.length; i++) {
        for (let j = i + 1; j < scene.userData.physicsObjects.length; j++) {
            const obj1 = scene.userData.physicsObjects[i];
            const obj2 = scene.userData.physicsObjects[j];

            // Simple sphere collision for performance
            const distSq = obj1.position.distanceToSquared(obj2.position);
            const minDist = 1.0; 
            const minDistSq = minDist * minDist;

            if (distSq < minDistSq) {
                // Resolve collision
                const dist = Math.sqrt(distSq);
                const normal = obj1.position.clone().sub(obj2.position).normalize();
                
                // Separate objects to prevent overlap
                const overlap = minDist - dist;
                const separation = normal.clone().multiplyScalar(overlap / 2);
                obj1.position.add(separation);
                obj2.position.sub(separation);

                // Exchange velocities (simple elastic collision)
                const relativeVelocity = obj1.userData.velocity.clone().sub(obj2.userData.velocity);
                const velocityAlongNormal = relativeVelocity.dot(normal);

                if (velocityAlongNormal < 0) { // Only resolve if moving towards each other
                    const restitution = 0.3; // Low bounciness to reduce jitter
                    const impulse = -(1 + restitution) * velocityAlongNormal;
                    const impulseVector = normal.clone().multiplyScalar(impulse / 2);
                    
                    obj1.userData.velocity.add(impulseVector);
                    obj2.userData.velocity.sub(impulseVector);
                    
                    // Apply friction
                    const tangent = relativeVelocity.clone().sub(normal.clone().multiplyScalar(velocityAlongNormal));
                    tangent.normalize();
                    const friction = 0.1;
                    const frictionImpulse = tangent.multiplyScalar(-friction * impulse); // Simple friction model
                    
                    obj1.userData.velocity.add(frictionImpulse);
                    obj2.userData.velocity.sub(frictionImpulse);
                }
            }
        }
    }
}

function destroyVoxel(instanceId, x, y, z, explosionCenter, force, radius) {
    const instancedMesh = worldGroup.userData.instancedMesh;
    if (!instancedMesh) return;

    // Hide the instance by scaling it to zero
    const matrix = new THREE.Matrix4();
    instancedMesh.getMatrixAt(instanceId, matrix);
    matrix.elements[0] = 0; 
    matrix.elements[5] = 0;
    matrix.elements[10] = 0;
    instancedMesh.setMatrixAt(instanceId, matrix);
    instancedMesh.instanceMatrix.needsUpdate = true;

    // Create dynamic debris
    const color = new THREE.Color();
    instancedMesh.getColorAt(instanceId, color);

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const voxel = new THREE.Mesh(geometry, material);
    
    // Position matches the static voxel
    voxel.position.set(x, y, z);
    voxel.castShadow = true;
    voxel.receiveShadow = true;
    
    // Physics setup
    voxel.userData.boundingBox = new THREE.Box3().setFromObject(voxel);
    
    scene.add(voxel);
    applyPhysicsToVoxel(voxel);

    // Calculate explosion physics
    let dir = voxel.position.clone().sub(explosionCenter);
    dir.add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.5
    ));
    if (dir.lengthSq() === 0) dir = new THREE.Vector3(0, 1, 0);
    dir.normalize();

    const dist = voxel.position.distanceTo(explosionCenter);
    const factor = Math.max(0, 1 - (dist / radius));

    const explosionImpulse = dir.multiplyScalar(force * factor);
    voxel.userData.velocity.add(explosionImpulse);
    voxel.userData.velocity.y += 2.0; 

    voxel.userData.angularVelocity.add(
        new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(force)
    );

    destroyedVoxels++;
    updateDestructionMeter();
}

function triggerExplosion(center, force, radius) {
    const voxelMap = worldGroup.userData.voxelMap;
    if (!voxelMap) return;

    // Iterate through the bounding box of the explosion radius
    // We use the map to find voxels in O(1) instead of iterating all voxels
    const r = Math.ceil(radius);
    const centerX = Math.round(center.x);
    const centerY = Math.floor(center.y); // Y is floor because of +0.5 offset logic
    const centerZ = Math.round(center.z);

    for (let x = -r; x <= r; x++) {
        for (let y = -r; y <= r; y++) {
            for (let z = -r; z <= r; z++) {
                // Check spherical distance
                if (x*x + y*y + z*z > radius*radius) continue;

                const checkX = centerX + x;
                const checkY = centerY + y; // Integer Y
                const checkZ = centerZ + z;
                
                // The map keys use Y + 0.5
                const key = `${checkX},${checkY + 0.5},${checkZ}`;
                
                if (voxelMap.has(key)) {
                    const instanceId = voxelMap.get(key);
                    
                    // Destroy the voxel
                    destroyVoxel(instanceId, checkX, checkY + 0.5, checkZ, center, force, radius);
                    
                    // Remove from map so it can't be hit again
                    voxelMap.delete(key);
                }
            }
        }
    }
    
    // Also check for dynamic objects (debris) in range
    // This is still O(N) on debris count, but debris count is usually small compared to static world
    if (scene.userData.physicsObjects) {
        const radiusSq = radius * radius;
        for (const obj of scene.userData.physicsObjects) {
            if (obj.position.distanceToSquared(center) < radiusSq) {
                 let dir = obj.position.clone().sub(center).normalize();
                 obj.userData.velocity.add(dir.multiplyScalar(force * 0.5));
            }
        }
    }
}

function checkCollisions() {
    if (!playerBox) return false;

    // Check collision with Dynamic Objects (Debris)
    let collided = false;
    if (scene.userData.physicsObjects) {
        for (const obj of scene.userData.physicsObjects) {
            if (obj.userData.boundingBox && !obj.userData.isHit) {
                 // Note: isHit is true for debris, but we might want to collide with large debris?
                 // For now, let's assume we only collide with "active" debris if we want.
                 // But usually debris is small.
                 // The original code checked !isHit, which meant it only collided with STATIC objects.
                 // But now static objects are in InstancedMesh.
            }
            // If we want to collide with debris:
            if (obj.userData.boundingBox && playerBox.intersectsBox(obj.userData.boundingBox)) {
                collided = true;
            }
        }
    }
    if (collided) return true;

    // Check collision with Static World (InstancedMesh)
    const voxelMap = worldGroup.userData.voxelMap;
    if (!voxelMap) return false;

    const min = playerBox.min;
    const max = playerBox.max;
    
    const minX = Math.floor(min.x);
    const maxX = Math.ceil(max.x);
    const minZ = Math.floor(min.z);
    const maxZ = Math.ceil(max.z);
    const minY = Math.floor(min.y - 0.5); 
    const maxY = Math.ceil(max.y - 0.5);

    for (let x = minX; x <= maxX; x++) {
        for (let z = minZ; z <= maxZ; z++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y + 0.5},${z}`;
                if (voxelMap.has(key)) {
                    // Precise AABB check
                    const voxelBox = new THREE.Box3();
                    voxelBox.min.set(x - 0.5, y, z - 0.5);
                    voxelBox.max.set(x + 0.5, y + 1, z + 0.5);
                    
                    if (playerBox.intersectsBox(voxelBox)) return true;
                }
            }
        }
    }

    return false;
}

function resetScene() {
    // Remove old world
    if (worldGroup) {
        scene.remove(worldGroup);
        
        // Dispose of InstancedMesh
        if (worldGroup.userData.instancedMesh) {
            worldGroup.userData.instancedMesh.geometry.dispose();
            worldGroup.userData.instancedMesh.material.dispose();
        }
        worldGroup.userData.voxelMap = null;
        worldGroup.userData.instancedMesh = null;
    }

    destroyedVoxels = 0;
    updateDestructionMeter();

    // Recreate world
    worldGroup = createVoxelWorld((count) => {
        totalVoxels = count;
        destroyedVoxels = 0;
        updateDestructionMeter();
    });
    scene.add(worldGroup);

    // Reset physics state
    // Remove all physics objects from scene
    if (scene.userData.physicsObjects) {
        for (const obj of scene.userData.physicsObjects) {
            if (obj.parent) obj.parent.remove(obj);
        }
    }
    scene.userData.physicsObjects = [];
    scene.userData.staticVoxels = null; 

    // Reset player
    playerObject.position.copy(defaultPlayerPosition);
    playerObject.rotation.copy(defaultPlayerRotation);
}

// Debug Toggle (Press 'H')
let isDebugVisible = true;
document.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'h') {
        isDebugVisible = !isDebugVisible;
        scene.traverse(obj => {
            if (obj.type === 'Box3Helper') {
                obj.visible = isDebugVisible;
            }
        });
    }
});

animate();

renderer.render(scene, camera);
