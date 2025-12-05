import * as THREE from 'three';

export function setupPlayerControls(camera, rendererDomElement) {
    // Player movement setup
    const keys = { 
        w: false, 
        a: false, 
        s: false, 
        d: false 
    };

    const playerSpeed = 25.0;
    const sensitivity = 0.002;

    // Create a playerObject (Group) to represent the player's body
    // This object handles position and Y-rotation
    const playerObject = new THREE.Group();
    playerObject.position.copy(camera.position); // Start at camera's initial world position
    
    // Reset camera to local origin of the player object
    // The camera now handles X-rotation
    camera.position.set(0, 1.8, 0); // Higher camera view
    camera.rotation.set(0, 0, 0);
    playerObject.add(camera);

    // Hitbox
    const playerBox = new THREE.Box3();
    const playerBoxSize = new THREE.Vector3(1, 4, 1); // Taller player (4 units tall)

    // Physics variables
    let velocityY = 0;
    const gravity = -35.0;
    const jumpStrength = 25.0;
    let isGrounded = false;

    // Track key states
    document.addEventListener("keydown", event => {
        keys[event.key.toLowerCase()] = true;
        if (event.code === "Space" && isGrounded) {
            velocityY = jumpStrength;
            isGrounded = false;
        }
    });
    document.addEventListener("keyup", event => {
        keys[event.key.toLowerCase()] = false;
    });

    // Pointer lock for proper mouse input
    rendererDomElement.addEventListener("click", () => {
        rendererDomElement.requestPointerLock();
    });

    // Mouse movement handler
    document.addEventListener("mousemove", (event) => {
        if (document.pointerLockElement !== rendererDomElement) return;

        // Rotate player body left/right
        playerObject.rotation.y -= event.movementX * sensitivity;

        // Rotate camera up/down
        camera.rotation.x -= event.movementY * sensitivity;
        
        // Clamp pitch to avoid flipping
        const limit = Math.PI / 2 - 0.01;
        camera.rotation.x = Math.max(-limit, Math.min(limit, camera.rotation.x));
    });

    function updatePlayerMovement(time, onCheckCollision) {
        // --- Vertical Movement (Gravity & Jumping) ---
        velocityY += gravity * time;
        const deltaY = velocityY * time;
        
        const oldY = playerObject.position.y;
        playerObject.position.y += deltaY;
        playerBox.setFromCenterAndSize(playerObject.position, playerBoxSize);

        // Floor Check (Simple Y check)
        // Player height is 4.0, center is at 2.0 relative to feet.
        if (playerObject.position.y < 2.0) {
            playerObject.position.y = 2.0;
            velocityY = 0;
            isGrounded = true;
            playerBox.setFromCenterAndSize(playerObject.position, playerBoxSize);
        }
        // Voxel Collision Check
        else if (onCheckCollision && onCheckCollision()) {
            // Collision detected on Y axis
            playerObject.position.y = oldY;
            playerBox.setFromCenterAndSize(playerObject.position, playerBoxSize);

            if (velocityY < 0) {
                // We hit the ground (voxel)
                isGrounded = true;
                velocityY = 0;
            } else {
                // We hit the ceiling
                velocityY = 0;
            }
        } else {
            // No collision, we are in the air
            isGrounded = false;
        }

        // --- Horizontal Movement ---
        const direction = new THREE.Vector3();
        
        // Get forward and right vectors relative to the player's rotation
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerObject.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(playerObject.quaternion);

        // Flatten to XZ plane so looking up/down doesn't affect movement direction
        forward.y = 0;
        forward.normalize();
        right.y = 0;
        right.normalize();

        if (keys.w) direction.add(forward);
        if (keys.s) direction.sub(forward);
        if (keys.d) direction.add(right);
        if (keys.a) direction.sub(right);

        if (direction.lengthSq() > 0) {
            direction.normalize();
            const moveVector = direction.multiplyScalar(playerSpeed * time);

            // Move X
            const oldX = playerObject.position.x;
            playerObject.position.x += moveVector.x;
            playerBox.setFromCenterAndSize(playerObject.position, playerBoxSize);
            
            if (onCheckCollision && onCheckCollision()) {
                playerObject.position.x = oldX; // Revert X
                playerBox.setFromCenterAndSize(playerObject.position, playerBoxSize);
            }

            // Move Z
            const oldZ = playerObject.position.z;
            playerObject.position.z += moveVector.z;
            playerBox.setFromCenterAndSize(playerObject.position, playerBoxSize);

            if (onCheckCollision && onCheckCollision()) {
                playerObject.position.z = oldZ; // Revert Z
                playerBox.setFromCenterAndSize(playerObject.position, playerBoxSize);
            }
        }
        
        // Reset if falling into void
        if (playerObject.position.y < -50) {
            playerObject.position.set(0, 10, 10);
            velocityY = 0;
        }
    }

    return { updatePlayerMovement, playerObject, playerBox, playerBoxSize };
}