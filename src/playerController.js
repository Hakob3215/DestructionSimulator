import * as THREE from 'three';

export function setupPlayerControls(camera, rendererDomElement) {
    // Player movement setup
    const keys = { 
        w: false, 
        a: false, 
        s: false, 
        d: false 
    };

    // Track key states
    document.addEventListener("keydown", event => {
        keys[event.key.toLowerCase()] = true;
    });
    document.addEventListener("keyup", event => {
        keys[event.key.toLowerCase()] = false;
    });

    // Mouse look setup
    let xRotation = 0;   // rotation around X axis
    const sensitivity = 0.002;

    // Create a player Object3D for y rotation
    const playerObject = new THREE.Object3D();
    playerObject.position.copy(camera.position);
    playerObject.add(camera);

    // Pointer lock for proper mouse input
    rendererDomElement.addEventListener("click", () => {
        rendererDomElement.requestPointerLock();
    });


    // Detects when mouse is moved
    document.addEventListener("mousemove", (event) => {
        // Makes sure mouse is locked to screen
        if (document.pointerLockElement !== rendererDomElement) return;

        // Yaw rotates the parent object
        playerObject.rotation.y -= event.movementX * sensitivity;
        xRotation -= event.movementY * sensitivity;

        // Clamps xRotation so camera doesn't flip
        const limit = Math.PI / 2 - 0.01;
        xRotation = Math.max(-limit, Math.min(limit, xRotation));

        camera.rotation.x = xRotation
    });

    const direction = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const playerSpeed = 25;

    function updatePlayerMovement(time) {
        direction.set(0, 0, 0);

        if (keys.w) direction.z += 1;
        if (keys.s) direction.z -= 1;
        if (keys.a) direction.x -= 1;
        if (keys.d) direction.x += 1;

        // Normalizes player speed
        if (direction.length() > 0) {
            direction.normalize();
        }

        // Calculate forward and right vectors based on yaw
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(playerObject.quaternion);
        const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(playerObject.quaternion);

        // Combine movement
        velocity.set(0, 0, 0);
        velocity.addScaledVector(forward, direction.z * playerSpeed * time);    // Forward and Back
        velocity.addScaledVector(right,   direction.x * playerSpeed * time);    // Left and Right

        // Apply movement to camera
        playerObject.position.add(velocity);
    }

    return { updatePlayerMovement, yawObject: playerObject };
}