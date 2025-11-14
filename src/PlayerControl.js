import * as THREE from 'three';

export function setupWASDControls(camera) {
    const keys = { w: false, a: false, s: false, d: false };

    // Track key states
    document.addEventListener("keydown", e => {
        keys[e.key.toLowerCase()] = true;
    });
    document.addEventListener("keyup", e => {
        keys[e.key.toLowerCase()] = false;
    });

    const direction = new THREE.Vector3();
    const velocity = new THREE.Vector3();
    const speed = 30; // units per second

    function updatePlayerMovement(time) {
        direction.set(0, 0, 0);

        if (keys.w) direction.z -= 1;
        if (keys.s) direction.z += 1;
        if (keys.a) direction.x -= 1;
        if (keys.d) direction.x += 1;

        if (direction.length() > 0) {
            direction.normalize();
        }

        velocity.copy(direction).multiplyScalar(speed * time);
        camera.position.add(velocity);
    }

    return { updatePlayerMovement };
}