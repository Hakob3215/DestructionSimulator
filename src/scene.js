import * as THREE from 'three';

export function createVoxelWorld(scene) {
    // Create ground plane
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    plane.receiveShadow = true;
    scene.add(plane);

    // Create a grid of cubes
    const gridSize = 8;
    const cubeSize = 1;
    const spacing = 0.01;
    const totalSize = gridSize * cubeSize + (gridSize - 1) * spacing;
    const offset = -totalSize / 2 + cubeSize / 2;

    const cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
    
    for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
            for (let z = 0; z < gridSize; z++) {
                const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x000 });
                const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

                cube.position.set(
                    offset + x * (cubeSize + spacing),
                    cubeSize / 2 + y * (cubeSize + spacing),
                    offset + z * (cubeSize + spacing)
                );

                cube.castShadow = true;
                cube.receiveShadow = true;
                
                cube.userData.boundingBox = new THREE.Box3().setFromObject(cube); // add hitbox (HAVE TO UPDATE HITBOX OF OBJ LATER FOR WHEN THEY MOVE)
                scene.add(cube);

                // Helper to see hitbox of the cube
                const cubeHelper = new THREE.Box3Helper(
                    cube.userData.boundingBox,
                    0xffff00
                );
                scene.add(cubeHelper);
            }
        }
    }


    const ambientLight = new THREE.AmbientLight(0x404040, 2); // soft white light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Configure shadow properties for the light
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
}
