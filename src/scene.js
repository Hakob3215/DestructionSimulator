import * as THREE from 'three';

export function createVoxelWorld() {
    const worldGroup = new THREE.Group();

    // Create ground plane
    const planeGeometry = new THREE.PlaneGeometry(100, 100);
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
    fetch('/level.txt') 
        .then(response => response.text())
        .then(text => {
            const voxelGeo = new THREE.BoxGeometry(1, 1, 1);
            const voxelMat = new THREE.MeshStandardMaterial({ color: 0x888888 });

            // Goxel txt format: X Y Z RRGGBB
            const lines = text.split('\n');
            
            lines.forEach(line => {
                // Remove comments or empty lines
                if (line.startsWith('#') || line.trim() === '') return;

                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    // Goxel coordinates: X Y Z
                    // In Three.js: Y is up. In Goxel Z is usually up.
                    // Let's assume Goxel Z -> Three.js Y, and Goxel Y -> Three.js Z
                    // Or just map directly if Goxel was configured for Y-up.
                    // Based on your file: -11 -11 0. The 3rd coord is 0, 1, 2... likely height (Y).
                    // Wait, looking at the file:
                    // -8 -3 1
                    // -8 -3 2
                    // -8 -3 3
                    // The 3rd coordinate is increasing like layers. So 3rd coord is definitely Height (Y in ThreeJS).
                    
                    const x = parseFloat(parts[0]);
                    const z = parseFloat(parts[1]); 
                    const y = parseFloat(parts[2]); 
                    
                    // Parse color
                    let color = 0x888888;
                    if (parts.length >= 4) {
                        // Goxel exports hex string without # usually, or with it.
                        // Your file has "ffffff".
                        let colorStr = parts[3];
                        if (!colorStr.startsWith('#')) {
                            colorStr = '#' + colorStr;
                        }
                        color = new THREE.Color(colorStr);
                    }

                    const mat = voxelMat.clone();
                    mat.color.set(color);

                    const voxel = new THREE.Mesh(voxelGeo, mat);
                    
                    // Adjust position
                    // Goxel coordinates are integers. Three.js cubes are size 1 centered at 0.5.
                    // We might need to offset by 0.5 if we want them to align perfectly with grid lines,
                    // but for physics it doesn't matter much as long as they don't overlap.
                    // Let's add 0.5 to Y so they sit ON the plane (if lowest Y is 0).
                    // Your file has Z (height) starting at 0.
                    
                    voxel.position.set(x, y + 0.5, z); 
                    
                    voxel.castShadow = true;
                    voxel.receiveShadow = true;

                    // Physics Data
                    voxel.userData.boundingBox = new THREE.Box3();
                    voxel.userData.boundingBox.setFromObject(voxel);
                    voxel.userData.isHit = false;

                    worldGroup.add(voxel);
                    
                    // Add helper (hidden by default, toggled with 'H')
                    const cubeHelper = new THREE.Box3Helper(
                        voxel.userData.boundingBox,
                        0xffff00
                    );
                    cubeHelper.visible = false; // Start hidden
                    // We need to tag it so our toggle logic finds it
                    // The toggle logic checks for obj.type === 'Box3Helper', which is standard.
                    worldGroup.add(cubeHelper);
                }
            });
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
