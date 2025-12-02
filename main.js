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
        const object = intersects[i].object;
        // Check if the object is a voxel (has boundingBox userData) and hasn't been hit yet
        if (object.userData.boundingBox && !object.userData.isHit) {
            console.log("Hammer hit voxel!");
            
            // Use explosion logic for hammer hit too!
            triggerExplosion(object.position, hammerExplosionForce, hammerExplosionRadius); // Strong force, radius 2
            
            // Plays rock smash sound
            rockSmashSound.clone(true).play();
            
            break; // Only hit one voxel per swing
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

    // Initialize static voxels list if not exists or empty (and scene has children)
    // Since we load asynchronously, we might need to rebuild this list once the level loads
    if (!scene.userData.staticVoxels || (scene.userData.staticVoxels.length === 0 && scene.children.length > 0)) {
        scene.userData.staticVoxels = [];
        scene.traverse(obj => {
            if (obj.userData.boundingBox && !obj.userData.isHit) {
                scene.userData.staticVoxels.push(obj);
            }
        });
    }

    if (scene.userData.physicsObjects.length === 0) return;

    const gravity = new THREE.Vector3(0, -20, 0);
    const floorY = 0.5; // Assuming cubes are size 1 and floor is at 0

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
            // Fade out effect (optional, requires material cloning which might be expensive)
            // if (obj.userData.life < 1.0) {
            //    obj.scale.setScalar(obj.userData.life);
            // }
        }

        // Apply gravity
        obj.userData.velocity.add(gravity.clone().multiplyScalar(time));
        
        // Update position
        obj.position.add(obj.userData.velocity.clone().multiplyScalar(time));
        
        // Update rotation
        // Dampen rotation over time to prevent infinite spinning
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
                // Instead of removing immediately, let lifetime handle it
                // scene.userData.physicsObjects.splice(i, 1);
                obj.userData.velocity.set(0,0,0);
                obj.userData.angularVelocity.set(0,0,0);
            }
        }
        
        // Update bounding box if needed
        // Note: Box3 is axis-aligned (AABB). It will grow to fit the rotated object but won't rotate with it.
        // For true OBB (Oriented Bounding Box) collision, we'd need a more complex physics engine (Cannon.js / Ammo.js).
        // For now, we are using sphere collision for physics objects, so the AABB is only used for player collision.
        // Updating it here ensures the player doesn't walk into the "ghost" of where the cube was.
        if (obj.userData.boundingBox) {
             obj.userData.boundingBox.setFromObject(obj);
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

    // Check for collisions between physics objects and static objects
    // Optimization: Only check static objects near the moving ones.
    // We can use a simple spatial hash or just check distance to the center of the grid if we know it.
    // But a simpler optimization is to only check static objects that are within a certain range of the moving object.
    
    // Assuming grid is aligned and cubes are size 1.
    // We can look up if a static voxel exists at the moving object's position.
    
    // First, let's build a quick lookup for static voxels if we haven't already or if it needs update
    // Actually, traversing the scene every frame is too slow.
    // Let's maintain a list of static voxels in scene.userData
    // (Moved initialization to top of function)

    // Filter static voxels that are now hit (this is still O(N) but N shrinks)
    // Better: remove from list when hit.
    
    for (let i = 0; i < scene.userData.physicsObjects.length; i++) {
        const movingObj = scene.userData.physicsObjects[i];
        
        // Optimization: Only check against static voxels that are close.
        // Since we don't have a spatial index, we still have to iterate, but let's try to be smarter.
        // If we assume the grid is roughly at the origin, we can skip checks if the moving object is far away.
        if (movingObj.position.lengthSq() > 1000) continue; // Skip if far away

        // Iterate backwards so we can remove hit voxels easily
        for (let j = scene.userData.staticVoxels.length - 1; j >= 0; j--) {
            const staticObj = scene.userData.staticVoxels[j];
            
            // Quick bounding box check first?
            // Or just distance check.
            // Optimization: Check squared distance to avoid sqrt
            const distSq = movingObj.position.distanceToSquared(staticObj.position);
            const minDistSq = 1.0; // 1.0 * 1.0

            if (distSq < minDistSq) {
                // Collision detected!
                
                if (movingObj.userData.isGrenade) {

                    // Trigger explosion at grenade position
                    triggerExplosion(movingObj.position, grenadeExplosionForce, grenadeExplosionRadius); // explosion force & radius

                    createExplosionEffect(movingObj.position);
                    playExplosionSoundAt(movingObj.position);

                    movingObj.userData.fuseSound.stop();
                    movingObj.userData.fuseSound.disconnect();

                    // Remove grenade object
                    if (movingObj.parent) movingObj.parent.remove(movingObj);

                    // Remove from physics list
                    scene.userData.physicsObjects.splice(i, 1);

                    continue;  // skip rest of collision logic
                }
                
                // Calculate impact direction
                const impactDirection = staticObj.position.clone().sub(movingObj.position).normalize();
                
                // Check if the impact is strong enough to dislodge the static block
                const impactSpeed = movingObj.userData.velocity.length();
                const minImpactSpeed = 20.0; // Increased threshold to prevent infinite chain reactions

                if (impactSpeed < minImpactSpeed) {
                    // Bounce off without breaking
                    const normal = impactDirection.clone().negate();
                    const velocityAlongNormal = movingObj.userData.velocity.dot(normal);
                    if (velocityAlongNormal < 0) {
                        const impulse = normal.clone().multiplyScalar(-1.2 * velocityAlongNormal);
                        movingObj.userData.velocity.add(impulse);
                    }
                    // Separate
                    const overlap = 1.0 - Math.sqrt(distSq);
                    movingObj.position.add(normal.clone().multiplyScalar(overlap));
                    continue; 
                }

                // TRIGGER EXPLOSION / CHUNK DAMAGE
                // Instead of just activating one block, we activate a small radius
                // This creates "chunks" and prevents straight-line artifacts
                
                const explosionRadius = 1.2; // Affects immediate neighbors
                const explosionForce = impactSpeed * 0.1; // Reduced force transfer to dampen chaos
                
                triggerExplosion(staticObj.position, explosionForce, explosionRadius);

                // Reflect the moving object
                const normal = impactDirection.clone().negate();
                const velocityAlongNormal = movingObj.userData.velocity.dot(normal);
                
                if (velocityAlongNormal < 0) {
                     const impulse = normal.clone().multiplyScalar(-1.1 * velocityAlongNormal); 
                     movingObj.userData.velocity.add(impulse);
                     movingObj.userData.velocity.multiplyScalar(0.5); 
                }
                break;
            }
                
                // Separate slightly to avoid sticking
                // const overlap = 1.0 - Math.sqrt(distSq);
                // movingObj.position.add(normal.clone().multiplyScalar(overlap));
            }
        }
    // Removed duplicate collision loop
}

function triggerExplosion(center, force, radius) {
    // Find all static voxels within radius
    // This is O(N) but N is small (<1000)
    
    // We need to iterate backwards because we are removing items
    if (!scene.userData.staticVoxels) return;

    const radiusSq = radius * radius;

    for (let i = scene.userData.staticVoxels.length - 1; i >= 0; i--) {
        const voxel = scene.userData.staticVoxels[i];

        // Optimization: Quick axis checks to avoid expensive distance calculation
        if (Math.abs(voxel.position.x - center.x) > radius) continue;
        if (Math.abs(voxel.position.y - center.y) > radius) continue;
        if (Math.abs(voxel.position.z - center.z) > radius) continue;

        const distSq = voxel.position.distanceToSquared(center);
        
        if (distSq < radiusSq) {
            // Remove from static list using Swap-and-Pop (O(1)) instead of splice (O(N))
            // This is crucial for performance when many blocks are destroyed at once
            const lastIndex = scene.userData.staticVoxels.length - 1;
            if (i < lastIndex) {
                scene.userData.staticVoxels[i] = scene.userData.staticVoxels[lastIndex];
            }
            scene.userData.staticVoxels.pop();
            
            // Calculate explosion force direction
            let dir = voxel.position.clone().sub(center);
            
            // Add randomness to direction to prevent planar artifacts
            dir.add(new THREE.Vector3(
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5,
                (Math.random() - 0.5) * 0.5
            ));

            if (dir.lengthSq() === 0) dir = new THREE.Vector3(0, 1, 0); // Handle exact center
            dir.normalize();
            
            // Apply physics
            // Force falls off with distance?
            const dist = Math.sqrt(distSq);
            const factor = 1 - (dist / radius); // 1 at center, 0 at edge
            
            applyPhysicsToVoxel(voxel);
            
            destroyedVoxels++;
            updateDestructionMeter();

            // Add velocity
            const explosionImpulse = dir.multiplyScalar(force * factor);
            voxel.userData.velocity.add(explosionImpulse);
            voxel.userData.velocity.y += 2.0; // Add slight upward pop
            
            // Add some random rotation
             voxel.userData.angularVelocity.add(
                new THREE.Vector3(Math.random()-0.5, Math.random()-0.5, Math.random()-0.5).multiplyScalar(force)
            );
        }
    }
}

function checkCollisions() {
    if (!playerBox) return false;

    let collided = false;

    scene.traverse(obj => {
        if (obj.userData.boundingBox) {
            // Don't collide with objects that have been hit (physics objects)
            if (obj.userData.isHit) return;
            
            if (playerBox.intersectsBox(obj.userData.boundingBox)) {
                collided = true;
            }
        }
    });

    return collided;
}

function resetScene() {
    // Remove old world
    if (worldGroup) {
        scene.remove(worldGroup);
        
        // Optional: Dispose of geometries and materials to prevent memory leaks
        worldGroup.traverse(obj => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(m => m.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
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
    scene.userData.physicsObjects = [];
    scene.userData.staticVoxels = null; // Will be rebuilt in updatePhysics

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
