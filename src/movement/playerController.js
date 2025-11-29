import * as THREE from 'three';
import { translationMatrix, rotationMatrixY } from './transformationMatrices';

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

    // Create a playerObject for y rotation
    const playerObject = new THREE.Object3D();
    playerObject.matrixAutoUpdate = false;  // Have to control playerObject manually now
    playerObject.position.copy(camera.position);
    playerObject.updateMatrix();

    playerObject.add(camera);

    // Pointer lock for proper mouse input
    rendererDomElement.addEventListener("click", () => {
        rendererDomElement.requestPointerLock();
    });


    // Detects when the mouse is moved
    document.addEventListener("mousemove", (event) => {
        // Makes sure mouse is locked to screen before detect movement
        if (document.pointerLockElement !== rendererDomElement) return;

        // Rotates playerObject vertically
        const playerAngleY = -event.movementX * sensitivity;
        const playerYMatrix = rotationMatrixY(playerAngleY);
        playerObject.matrix.multiply(playerYMatrix);

        // Rotates camera horizontally
        xRotation -= event.movementY * sensitivity;
        const limit = Math.PI / 2 - 0.01;
        xRotation = Math.max(-limit, Math.min(limit, xRotation));   // Clamps xRotation so camera doesn't flip
        camera.rotation.x = xRotation

        // Recompute matrixWorld
        //playerObject.updateMatrixWorld();
    });

    const playerSpeed = 25;

    function updatePlayerMovement(time) {
        // Movement direction
        const direction = new THREE.Vector3();

        if (keys.w) direction.z -= 1;
        if (keys.s) direction.z += 1;
        if (keys.a) direction.x -= 1;
        if (keys.d) direction.x += 1;

        // Normalize so diagonal movementis same speed
        if (direction.length() > 0) {
            direction.normalize();
        } else {
            return; // no movement
        }

        const moveX = direction.x * playerSpeed * time;
        const moveZ = direction.z * playerSpeed * time;

        // if no movement, skip matrix operations
        if (moveX === 0 && moveZ === 0) return;

        const movementMatrix = translationMatrix(moveX, 0, moveZ);
        playerObject.matrix.multiply(movementMatrix);
        playerObject.updateMatrixWorld(true);

        // Decompose matrix so ThreeJS updates camera position
        playerObject.matrix.decompose(
            playerObject.position,
            playerObject.quaternion,
            playerObject.scale
        );
    }

    return { updatePlayerMovement, yawObject: playerObject };
}