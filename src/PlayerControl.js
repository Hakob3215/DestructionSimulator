import * as THREE from 'three';

export function setupPlayerControls(camera, rendererDomElement, colliders, playerBox) {
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
    //let yAxisRotation = 0;   // rotation around Y axis
    let xRotation = 0;   // rotation around X axis
    const sensitivity = 0.002;

    // Create a parent Object3D for y rotation
    const yRotationObject = new THREE.Object3D();
    yRotationObject.position.copy(camera.position);
    yRotationObject.add(camera);

    // Pointer lock for proper mouse input
    rendererDomElement.addEventListener("click", () => {
        rendererDomElement.requestPointerLock();
    });


    document.addEventListener("mousemove", (event) => {
        if (document.pointerLockElement !== rendererDomElement) return;

        // Yaw rotates the parent object
        yRotationObject.rotation.y -= event.movementX * sensitivity;
        xRotation -= event.movementY * sensitivity;

        // Clamp xAxisRotation so camera doesn't flip
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
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(yRotationObject.quaternion);
        const right   = new THREE.Vector3(1, 0, 0).applyQuaternion(yRotationObject.quaternion);

        // Combine movement
        velocity.set(0, 0, 0);
        velocity.addScaledVector(forward, direction.z * playerSpeed * time);    // Forward and Back
        velocity.addScaledVector(right,   direction.x * playerSpeed * time);    // Left and Right

        // Apply Movement to Camera
        const oldPos = yRotationObject.position.clone();

        // Apply Movement to Player
        yRotationObject.position.add(velocity);

        // Update Hitbot
        playerBox.setFromCenterAndSize(
            yRotationObject.position,
            new THREE.Vector3(1, 3, 1)
        );

        // COLLISION CHECK
        for (const collider of colliders) {
            if (playerBox.intersectsBox(collider)) {
                // COLLISION → RESTORE OLD POSITION
                yRotationObject.position.copy(oldPos);
                updatePlayerBox();
                break;
            }
        }
    }

    return { updatePlayerMovement, yawObject: yRotationObject };
}