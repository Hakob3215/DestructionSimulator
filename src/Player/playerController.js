import * as THREE from 'three';

export function setupPlayerControls(camera, rendererDomElement) {
    // Player movement setup
    const keys = { 
        w: false, 
        a: false, 
        s: false, 
        d: false 
    };

    const playerSpeed = 10.0;
    const sensitivity = 0.002;

    // Create a playerObject (Group) to represent the player's body
    // This object handles position and Y-rotation (Yaw)
    const playerObject = new THREE.Group();
    playerObject.position.copy(camera.position); // Start at camera's initial world position
    
    // Reset camera to local origin of the player object
    // The camera now handles X-rotation (Pitch)
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    playerObject.add(camera);

    // Hitbox
    const playerBox = new THREE.Box3();
    const playerBoxSize = new THREE.Vector3(1, 2, 1); // Size of the player

    // Track key states
    document.addEventListener("keydown", event => {
        keys[event.key.toLowerCase()] = true;
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

        // Rotate player body left/right (Yaw)
        playerObject.rotation.y -= event.movementX * sensitivity;

        // Rotate camera up/down (Pitch)
        camera.rotation.x -= event.movementY * sensitivity;
        
        // Clamp pitch to avoid flipping
        const limit = Math.PI / 2 - 0.01;
        camera.rotation.x = Math.max(-limit, Math.min(limit, camera.rotation.x));
    });

    function updatePlayerMovement(time, onCheckCollision) {
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
    }

    return { updatePlayerMovement, playerObject, playerBox, playerBoxSize };
}