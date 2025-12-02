import * as THREE from 'three';

export function createVoxelWorld(levelUrl, onLoadCallback) {
    const worldGroup = new THREE.Group();

    // Create ground plane
    const planeGeometry = new THREE.PlaneGeometry(1000, 1000);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc, side: THREE.DoubleSide });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    plane.receiveShadow = true;
    worldGroup.add(plane);

    // Create a grid of cubes (REMOVED - Loading from level.txt instead)
    /*
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
                worldGroup.add(cube);

                // Helper to see hitbox of the cube
                const cubeHelper = new THREE.Box3Helper(
                    cube.userData.boundingBox,
                    0xffff00
                );
                worldGroup.add(cubeHelper);
            }
        }
    }

    // Create a separate wall for testing
    const wallWidth = 10;
    const wallHeight = 5;
    const wallZ = -10; // Position the wall behind the main grid (relative to camera start)

    for (let x = 0; x < wallWidth; x++) {
        for (let y = 0; y < wallHeight; y++) {
            const cubeMaterial = new THREE.MeshStandardMaterial({ color: 0x882222 }); // Reddish wall
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);

            cube.position.set(
                offset + x * (cubeSize + spacing),
                cubeSize / 2 + y * (cubeSize + spacing),
                wallZ
            );

            cube.castShadow = true;
            cube.receiveShadow = true;
            
            cube.userData.boundingBox = new THREE.Box3().setFromObject(cube);
            worldGroup.add(cube);

            const cubeHelper = new THREE.Box3Helper(
                cube.userData.boundingBox,
                0xff0000 // Red helper for wall
            );
            worldGroup.add(cubeHelper);
        }
    }
    */

    // Load Level from Text File
    fetch(levelUrl) 
        .then(response => response.text())
        .then(text => {
            // Goxel txt format: X Y Z RRGGBB
            const lines = text.split('\n').filter(l => l.trim() !== '' && !l.startsWith('#'));
            const voxelCount = lines.length;

            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ color: 0xffffff }); 
            const instancedMesh = new THREE.InstancedMesh(geometry, material, voxelCount);
            
            instancedMesh.castShadow = true;
            instancedMesh.receiveShadow = true;

            const voxelMap = new Map(); // Key: "x,y,z", Value: instanceId
            const dummy = new THREE.Object3D();
            const color = new THREE.Color();
            
            let index = 0;
            lines.forEach(line => {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const x = parseFloat(parts[0]);
                    const z = parseFloat(parts[1]); 
                    const y = parseFloat(parts[2]); 
                    
                    // Parse color
                    if (parts.length >= 4) {
                        let colorStr = parts[3];
                        if (!colorStr.startsWith('#')) {
                            colorStr = '#' + colorStr;
                        }
                        color.set(colorStr);
                    } else {
                        color.set(0x888888);
                    }

                    // Position
                    dummy.position.set(x, y + 0.5, z);
                    dummy.updateMatrix();
                    instancedMesh.setMatrixAt(index, dummy.matrix);
                    instancedMesh.setColorAt(index, color);

                    // Map for physics lookups
                    voxelMap.set(`${x},${y + 0.5},${z}`, index);
                    
                    index++;
                }
            });

            instancedMesh.instanceMatrix.needsUpdate = true;
            instancedMesh.instanceColor.needsUpdate = true;

            worldGroup.add(instancedMesh);
            
            // Store map and mesh for physics engine to use
            worldGroup.userData.voxelMap = voxelMap;
            worldGroup.userData.instancedMesh = instancedMesh;

            if (onLoadCallback) {
                onLoadCallback(voxelCount);
            }
        })
        .catch(err => console.error("Failed to load level:", err));
    

    const ambientLight = new THREE.AmbientLight(0x404040, 2); // soft white light
    worldGroup.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 200, 50);
    directionalLight.castShadow = true;
    worldGroup.add(directionalLight);

    const sunGeometry = new THREE.SphereGeometry(8, 32, 32);
    const glowingSunMaterial = new THREE.MeshPhongMaterial({
        color: 0xFFFF00, // Yellow color
        emissive: 0xFFFF00 // Yellow glowing effect
    });

    const sunMesh = new THREE.Mesh(sunGeometry, glowingSunMaterial);
    // Attaches sun to the directional light
    // Feel free to change directional light position
    directionalLight.add(sunMesh);

    // Configure shadow properties for the light
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    return worldGroup;
}
