import * as THREE from 'three';
import { createVoxelWorld } from './src/scene.js';
import { setupPlayerControls } from './src/Player/playerController.js';
import { createHammer } from './src/Weapons/hammer.js';
import { createCartoonBomb } from './src/Weapons/grenade.js';
import { createDynamite } from './src/Weapons/grenade.js';

// Basic setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
const listener = new THREE.AudioListener();
const audioLoader = new THREE.AudioLoader();

// Chnages skybox color to sky blue
scene.background = new THREE.Color(0x87CEEB);

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
let worldGroup = createVoxelWorld();
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
const hammerSwingSound = new THREE.Audio( listener );
audioLoader.load('./src/Audio/SFX/hammerSwing.mp3', function( buffer ) {
    hammerSwingSound.setBuffer(buffer);
    hammerSwingSound.setLoop(false);
    hammerSwingSound.setVolume(1.0);
});

// SFX for hitting stone object
const rockSmashSound = new THREE.Audio( listener );
audioLoader.load('./src/Audio/SFX/rockSmash.mp3', function( buffer ) {
    rockSmashSound.setBuffer(buffer);
    rockSmashSound.setLoop(false);
    rockSmashSound.setVolume(1.0);
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

    renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Handle mouse click for hammer swing
document.addEventListener('mousedown', () => {
    if (!isSwinging) {
        isSwinging = true;
        hammerSwingSound.clone(true).play();
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
            triggerExplosion(object.position, 15, 2.0); // Strong force, radius 2
            
            // Plays 
            rockSmashSound.clone(true).play();
            
            break; // Only hit one voxel per swing
        }
    }
}

function applyPhysicsToVoxel(voxel) {
    voxel.userData.isHit = true;
    voxel.userData.velocity = new THREE.Vector3(0, 0, 0);
    voxel.userData.angularVelocity = new THREE.Vector3(0, 0, 0);
    voxel.userData.life = 10.0; // Seconds before disappearing
    
    // Add to a list of active physics objects to update in the loop
    if (!scene.userData.physicsObjects) {
        scene.userData.physicsObjects = [];
    }
    scene.userData.physicsObjects.push(voxel);

    // Remove from staticVoxels list if it exists there
    if (scene.userData.staticVoxels) {
        const index = scene.userData.staticVoxels.indexOf(voxel);
        if (index > -1) {
            scene.userData.staticVoxels.splice(index, 1);
        }
    }
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
    // Even better: We know the grid structure! We can calculate exactly which static voxel *might* be at a position.
    
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

    for (let i = scene.userData.staticVoxels.length - 1; i >= 0; i--) {
        const voxel = scene.userData.staticVoxels[i];
        const distSq = voxel.position.distanceToSquared(center);
        
        if (distSq < radius * radius) {
            // Remove from static
            scene.userData.staticVoxels.splice(i, 1);
            
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
            // or maybe we DO want to collide with them? 
            // For now, let's collide with everything that has a bounding box.
            // But we must ensure we don't collide with ourselves if we had a bounding box (we don't on userData)
            
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

    // Recreate world
    worldGroup = createVoxelWorld();
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
