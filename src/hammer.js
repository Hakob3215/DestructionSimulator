import * as THREE from 'three';

export function createHammer() {
    // GROUP for the whole hammer
    const hammer = new THREE.Group();

    // Hammer Handle
    const handleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.4, 16);
    const handleMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);

    handle.position.y = 0.7; // aligns bottom of handle with y = 0
    hammer.add(handle);

    // Hammer Head
    const headGeometry = new THREE.BoxGeometry(1.3, 0.4, 0.4);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const head = new THREE.Mesh(headGeometry, headMaterial);

    head.position.y = 1.4; // sits on top of the shorter handle
    hammer.add(head);

    return hammer;
}