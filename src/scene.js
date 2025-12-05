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
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    
    // Soft Shadows
    directionalLight.shadow.radius = 4; 
    directionalLight.shadow.bias = -0.0005; // Reduces shadow acne

    return worldGroup;
}
