import * as THREE from 'three';

export function createDynamite() {
    const group = new THREE.Group();

    // Common Material
    const redMat = new THREE.MeshStandardMaterial({
        color: 0xcc0000,
        roughness: 0.4,
        metalness: 0.1
    });

    const capMat = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.5
    });

    // 3 Sticks
    function createStick() {
        const stickGroup = new THREE.Group();

        const cylGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 32);

        // tube body
        const tube = new THREE.Mesh(cylGeo, redMat);
        stickGroup.add(tube);

        // end caps
        const capGeo = new THREE.CircleGeometry(0.3, 32);

        const cap1 = new THREE.Mesh(capGeo, capMat);
        cap1.rotation.x = -Math.PI / 2;
        cap1.position.y = 1.5;
        stickGroup.add(cap1);

        const cap2 = new THREE.Mesh(capGeo, capMat);
        cap2.rotation.x = Math.PI / 2;
        cap2.position.y = -1.5;
        stickGroup.add(cap2);

        return stickGroup;
    }

    // 3 sticks arranged triangular
    const stick1 = createStick();
    const stick2 = createStick();
    const stick3 = createStick();

    stick1.position.set(0, 0, 0);
    stick2.position.set(0.55, 0, -0.35);
    stick3.position.set(-0.55, 0, -0.35);

    group.add(stick1, stick2, stick3);

    // Straps
    const strapGeo = new THREE.BoxGeometry(2, 0.1, 0.6);
    const strapMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.3,
        metalness: 0.2
    });

    const strap1 = new THREE.Mesh(strapGeo, strapMat);
    strap1.position.y = 0.5;
    group.add(strap1);

    const strap2 = new THREE.Mesh(strapGeo, strapMat);
    strap2.position.y = -0.5;
    group.add(strap2);

    // Fuse
    const fusePath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 1.5, 0),
        new THREE.Vector3(0.4, 2.2, 0),
        new THREE.Vector3(0.1, 2.8, 0)
    ]);

    const fuseGeo = new THREE.TubeGeometry(fusePath, 20, 0.05, 8, false);
    const fuseMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa });
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    group.add(fuse);

    // Red Dot
    const dotGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const redDot = new THREE.Mesh(dotGeo, dotMat);
    redDot.position.copy(fusePath.getPoint(1)); // end of fuse curve

    group.add(redDot);

    return group;
}

export function createCartoonBomb() {
    const bomb = new THREE.Group();

    // Bomb Body
    const bodyGeo = new THREE.SphereGeometry(1, 32, 32);
    const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.4,
        metalness: 0.7
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    bomb.add(body);

    // Fuse Cap
    const capGeo = new THREE.CylinderGeometry(0.25, 0.3, 0.2, 16);
    const capMat = new THREE.MeshStandardMaterial({
        color: 0x555555,
        metalness: 0.8,
        roughness: 0.3
    });
    const cap = new THREE.Mesh(capGeo, capMat);
    cap.position.set(0, 1.05, 0);
    bomb.add(cap);

    // Fuse
    const fuseGeo = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
            new THREE.Vector3(0, 1.1, 0),
            new THREE.Vector3(0.1, 1.3, 0),
            new THREE.Vector3(0, 1.45, 0)
        ]),
        20,
        0.05,
        8,
        false
    );
    const fuseMat = new THREE.MeshStandardMaterial({
        color: 0xffffff
    });
    const fuse = new THREE.Mesh(fuseGeo, fuseMat);
    bomb.add(fuse);

    // Red Dot
    const dotGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({
        color: 0xff0000
    });
    const redDot = new THREE.Mesh(dotGeo, dotMat);
    redDot.position.set(0, 1.48, 0);

    bomb.add(redDot);

    return bomb;
}