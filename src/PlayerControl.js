import * as THREE from 'three';

export function setupWASDControls(camera) {
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

    const direction = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const playerSpeed = 30;

    function updatePlayerMovement(time) {
        direction.set(0, 0, 0);

        if (keys.w) direction.z -= 1;
        if (keys.s) direction.z += 1;
        if (keys.a) direction.x -= 1;
        if (keys.d) direction.x += 1;

        // Normalizes player speed
        if (direction.length() > 0) {
            direction.normalize();
        }

        velocity.copy(direction).multiplyScalar(playerSpeed * time);
        camera.position.add(velocity);
    }

    return { updatePlayerMovement };
}