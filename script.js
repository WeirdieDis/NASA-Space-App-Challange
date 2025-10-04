let scene, camera, renderer, controls;
let habitatInner, habitatOuter; // References to our two spheres
let isTransparentView = false; // State for the view toggle
let outerWireframe; // Declare outerWireframe globally so toggleView can access it

// Helper function to create wall geometries that curve with the sphere
function createCurvedWallGeometry(height, y_center_abs, inner_rad, wall_thickness) {
    const sphere_rad = 4.8; // Corresponds to innerHabitatRadius
    const segments = 16;
    const shape = new THREE.Shape();

    const y_start_abs = y_center_abs - height / 2;
    // Safety check to prevent Math.sqrt of a negative number
    if (sphere_rad ** 2 < y_start_abs ** 2) return new THREE.BoxGeometry(0, 0, 0);
    const r_start = Math.sqrt(sphere_rad ** 2 - y_start_abs ** 2);

    // Define shape in local coordinates (y starts at 0)
    shape.moveTo(inner_rad, 0);
    shape.lineTo(r_start, 0);

    // Create the curved outer edge
    for (let i = 1; i <= segments; i++) {
        const h = height * (i / segments);
        const y_abs = y_start_abs + h;
        if (sphere_rad ** 2 > y_abs ** 2) {
            const r_outer = Math.sqrt(sphere_rad ** 2 - y_abs ** 2);
            shape.lineTo(r_outer, h);
        }
    }

    const y_end_abs = y_center_abs + height / 2;
    if (sphere_rad ** 2 < y_end_abs ** 2) return new THREE.BoxGeometry(0, 0, 0);
    const r_end = Math.sqrt(sphere_rad ** 2 - y_end_abs ** 2);

    shape.lineTo(r_end, height);
    shape.lineTo(inner_rad, height);
    shape.closePath();

    const extrudeSettings = {
        depth: wall_thickness,
        bevelEnabled: false
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // Center the geometry so it can be rotated around its radial axis
    const avg_outer_rad = (r_start + r_end) / 2;
    geometry.translate(-(inner_rad + avg_outer_rad) / 2, -height / 2, -wall_thickness / 2);

    return geometry;
}


init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xC27E62); // Butterscotch Martian sky
    scene.fog = new THREE.Fog(0xC27E62, 20, 100); // Butterscotch atmospheric haze

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls - Allows you to orbit the camera
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = false;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);

    // Texture Loader for the inner habitat's "fabric"
    const textureLoader = new THREE.TextureLoader();
    const fabricTexture = textureLoader.load('https://threejs.org/examples/textures/metalness.png');
    fabricTexture.wrapS = THREE.RepeatWrapping;
    fabricTexture.wrapT = THREE.RepeatWrapping;
    fabricTexture.repeat.set(6, 4);

    // --- Habitat Layers ---

    // 1. Inner Habitat (Structural / Interior Wall / Insulation)
    const innerHabitatRadius = 4.8;
    const innerHabitatGeometry = new THREE.SphereGeometry(innerHabitatRadius, 32, 16);
    const innerHabitatMaterial = new THREE.MeshStandardMaterial({
        map: fabricTexture,
        color: 0xcccccc,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    habitatInner = new THREE.Mesh(innerHabitatGeometry, innerHabitatMaterial);
    habitatInner.name = 'HabitatInner';
    scene.add(habitatInner);

    // Wireframe for the inner habitat
    const innerWireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(innerHabitatGeometry),
        new THREE.LineBasicMaterial({
            color: 0x00bbff,
            linewidth: 1
        })
    );
    scene.add(innerWireframe);


    // 2. Outer Shell (Regolith / Composite Protection Layer)
    const outerHabitatRadius = 5;
    const outerHabitatGeometry = new THREE.SphereGeometry(outerHabitatRadius, 32, 16);
    const outerHabitatMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.8,
        metalness: 0.1,
        transparent: false,
        opacity: 1,
        side: THREE.FrontSide
    });
    habitatOuter = new THREE.Mesh(outerHabitatGeometry, outerHabitatMaterial);
    habitatOuter.name = 'HabitatOuter';
    scene.add(habitatOuter);

    // Wireframe for the outer habitat
    outerWireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(outerHabitatGeometry),
        new THREE.LineBasicMaterial({
            color: 0x888800,
            linewidth: 1
        })
    );
    scene.add(outerWireframe);

    // Create Central Life Support System (LSS) Core
    const lssTexture = textureLoader.load('https://threejs.org/examples/textures/metalness.png');
    lssTexture.wrapS = THREE.RepeatWrapping;
    lssTexture.wrapT = THREE.RepeatWrapping;
    lssTexture.repeat.set(2, 4);

    const lssRadius = 1.5;
    const lssGeometry = new THREE.CylinderGeometry(lssRadius, lssRadius, innerHabitatRadius * 2 * 0.95, 32);
    const lssMaterial = new THREE.MeshStandardMaterial({
        map: lssTexture,
        color: 0xbbbbcc,
        metalness: 0.8,
        roughness: 0.4
    });
    const lssCore = new THREE.Mesh(lssGeometry, lssMaterial);
    scene.add(lssCore);

    // --- Create Main Living Compartment ---
    const mainLevel = new THREE.Group();
    const compartmentMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        side: THREE.DoubleSide
    });

    const compartmentHeight = 3.0;
    const innerRad = lssRadius;
    const outerRad = Math.sqrt(innerHabitatRadius ** 2 - (compartmentHeight / 2) ** 2);

    const ringGeometry = new THREE.RingGeometry(innerRad, outerRad, 64);

    const floor = new THREE.Mesh(ringGeometry, compartmentMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -compartmentHeight / 2;
    mainLevel.add(floor);

    const ceiling = new THREE.Mesh(ringGeometry, compartmentMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = compartmentHeight / 2;
    mainLevel.add(ceiling);

    const innerWallGeom = new THREE.CylinderGeometry(innerRad, innerRad, compartmentHeight, 64, 1, true);
    const innerWall = new THREE.Mesh(innerWallGeom, compartmentMaterial);
    mainLevel.add(innerWall);

    const numSeparators = 3;
    const wallThickness = 0.1;
    const lowerWallGeom = createCurvedWallGeometry(compartmentHeight, 0, innerRad, wallThickness);

    const windowOutlineGeometry = new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, 0.5, 0, Math.PI * 2, false).getPoints(50)
    );
    const windowOutlineMaterial = new THREE.LineBasicMaterial({
        color: 0x333333
    });

    // Define asset properties
    const cabinMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: 0.6
    });
    const cabinGeom = new THREE.BoxGeometry(1.0, 2.2, 1.0);
    const acMaterial = new THREE.MeshStandardMaterial({
        color: 0xeeeeff,
        metalness: 0.5,
        roughness: 0.5
    });
    const acGeom = new THREE.BoxGeometry(0.5, 0.3, 0.4);
    const pipeMaterial = new THREE.MeshStandardMaterial({
        color: 0x9999aa,
        metalness: 0.7,
        roughness: 0.3
    });
    const bedMaterial = new THREE.MeshStandardMaterial({
        color: 0x405070,
        roughness: 0.8
    });
    const bedGeom = new THREE.BoxGeometry(0.9, 0.4, 1.9);
    const deskMaterial = new THREE.MeshStandardMaterial({
        color: 0x333842,
        metalness: 0.8,
        roughness: 0.6
    });
    const screenMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0x102040,
        emissiveIntensity: 0.6
    });
    const wireMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        roughness: 0.2
    });
    const deskTopGeom = new THREE.BoxGeometry(1.0, 0.04, 0.5);
    const deskLegGeom = new THREE.BoxGeometry(0.05, 0.7, 0.05);
    const screenGeom = new THREE.BoxGeometry(0.7, 0.4, 0.02);
    const filterMaterial = new THREE.MeshStandardMaterial({
        color: 0xc0c0c0,
        metalness: 0.9,
        roughness: 0.4
    });


    for (let i = 0; i < numSeparators; i++) {
        const angle = i * (Math.PI * 2 / numSeparators);
        const sectorAngle = Math.PI * 2 / numSeparators;

        const wallGroup = new THREE.Group();
        const wall = new THREE.Mesh(lowerWallGeom, compartmentMaterial);
        wallGroup.add(wall);
        const window1 = new THREE.LineLoop(windowOutlineGeometry, windowOutlineMaterial);
        window1.position.z = (wallThickness / 2) + 0.001;
        wallGroup.add(window1);
        const window2 = new THREE.LineLoop(windowOutlineGeometry, windowOutlineMaterial);
        window2.position.z = -(wallThickness / 2) - 0.001;
        window2.rotation.y = Math.PI;
        wallGroup.add(window2);
        const radius = (innerRad + outerRad) / 2;
        wallGroup.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
        wallGroup.rotation.y = -angle;
        mainLevel.add(wallGroup);

        // Add furniture and equipment
        const cabin = new THREE.Mesh(cabinGeom, cabinMaterial);
        const cabinAngle = angle + sectorAngle / 2;
        const cabinRadius = outerRad - 1.0 / 2 - 0.;
        cabin.position.set(Math.cos(cabinAngle) * cabinRadius, -compartmentHeight / 2 + 2.2 / 2, Math.sin(cabinAngle) * cabinRadius);
        cabin.rotation.y = -cabinAngle;
        mainLevel.add(cabin);

        const acUnit = new THREE.Mesh(acGeom, acMaterial);
        const acRadius = innerRad + 0.4 / 2;
        acUnit.position.set(Math.cos(cabinAngle) * acRadius, (compartmentHeight / 2) - (0.3 / 2) - 0.1, Math.sin(cabinAngle) * acRadius);
        acUnit.rotation.y = -cabinAngle;
        mainLevel.add(acUnit);

        const pipeRadius = 0.05;
        const pipeStart = new THREE.Vector3(Math.cos(cabinAngle) * innerRad, acUnit.position.y - 0.3 / 2, Math.sin(cabinAngle) * innerRad);
        const pipeEnd = new THREE.Vector3(Math.cos(cabinAngle) * lssRadius, acUnit.position.y - 0.3 / 2, Math.sin(cabinAngle) * lssRadius);
        const pipeMid = pipeStart.clone().lerp(pipeEnd, 0.5).add(new THREE.Vector3(0, -0.3, 0));
        const pipeCurve = new THREE.QuadraticBezierCurve3(pipeStart, pipeMid, pipeEnd);
        const pipeGeom = new THREE.TubeGeometry(pipeCurve, 20, pipeRadius, 8, false);
        const pipe = new THREE.Mesh(pipeGeom, pipeMaterial);
        mainLevel.add(pipe);

        const bed = new THREE.Mesh(bedGeom, bedMaterial);
        const bedAngle = angle + sectorAngle * 0.25;
        const bedRadius = outerRad - 1.9 / 2 - 0.2;
        bed.position.set(Math.cos(bedAngle) * bedRadius, -compartmentHeight / 2 + 0.4 / 2, Math.sin(bedAngle) * bedRadius);
        bed.rotation.y = -bedAngle;
        mainLevel.add(bed);

        const computerGroup = new THREE.Group();
        const deskTop = new THREE.Mesh(deskTopGeom, deskMaterial);
        deskTop.position.y = 0.7;
        computerGroup.add(deskTop);
        const leg1 = new THREE.Mesh(deskLegGeom, deskMaterial);
        leg1.position.set(1.0 / 2 - 0.05, 0.7 / 2, 0.5 / 2 - 0.05);
        computerGroup.add(leg1);
        const leg2 = new THREE.Mesh(deskLegGeom, deskMaterial);
        leg2.position.set(-1.0 / 2 + 0.05, 0.7 / 2, 0.5 / 2 - 0.05);
        computerGroup.add(leg2);
        const screen = new THREE.Mesh(screenGeom, screenMaterial);
        screen.position.y = 0.7 + 0.4 / 2 + 0.04;
        screen.position.z = -0.5 / 2 + 0.02;
        screen.rotation.x = 0.15;
        computerGroup.add(screen);
        const wireStart = new THREE.Vector3(0, 0.7 - 0.1, -0.5 / 2);
        const wireEnd = new THREE.Vector3(0, 0, -0.5 / 2);
        const wireMid = new THREE.Vector3(0, 0.7 / 2, -0.5 / 2 - 0.2);
        const wireCurve = new THREE.QuadraticBezierCurve3(wireStart, wireMid, wireEnd);
        const wireGeom = new THREE.TubeGeometry(wireCurve, 10, 0.02, 8, false);
        const wire = new THREE.Mesh(wireGeom, wireMaterial);
        computerGroup.add(wire);
        const deskAngle = angle + sectorAngle * 0.75;
        const deskGroupRadius = outerRad - 0.5 / 2 - 0.2;
        computerGroup.position.set(Math.cos(deskAngle) * deskGroupRadius, -compartmentHeight / 2, Math.sin(deskAngle) * deskGroupRadius);
        computerGroup.rotation.y = -deskAngle;
        mainLevel.add(computerGroup);

        const filtrationUnitGeom = new THREE.BoxGeometry(0.6, 0.8, 0.6);
        const filtrationUnit = new THREE.Mesh(filtrationUnitGeom, filterMaterial);
        const filterRadius = innerRad + 0.3;
        const techLevelYFloor = (-compartmentHeight / 2) - 1.75;
        const filtrationUnitY = techLevelYFloor + (0.8 / 2); // Floor position + half the unit's height

        filtrationUnit.position.set(
            Math.cos(cabinAngle) * filterRadius,
            filtrationUnitY, // Use the corrected Y position
            Math.sin(cabinAngle) * filterRadius
        );
        filtrationUnit.rotation.y = -cabinAngle;
        scene.add(filtrationUnit);

        const wastePipeStart = cabin.position.clone();
        wastePipeStart.y -= 1.1;
        const wastePipeEnd = filtrationUnit.position.clone();
        wastePipeEnd.y += 0.4;
        const wastePipeMid = wastePipeStart.clone().lerp(wastePipeEnd, 0.5);
        wastePipeMid.x *= 1.1;
        wastePipeMid.z *= 1.1;

        const wastePipeCurve = new THREE.QuadraticBezierCurve3(wastePipeStart, wastePipeMid, wastePipeEnd);
        const wastePipeGeom = new THREE.TubeGeometry(wastePipeCurve, 20, 0.04, 8, false);
        const wastePipe = new THREE.Mesh(wastePipeGeom, pipeMaterial);
        scene.add(wastePipe);
    }
    scene.add(mainLevel);

    // --- Upper Recreational Level ---
    const upperLevel = new THREE.Group();
    upperLevel.name = "UpperLevel";
    const upperLevelHeight = 2.5;
    const upperLevelYFloor = compartmentHeight / 2;
    const upperLevelYCenter = upperLevelYFloor + upperLevelHeight / 2;

    // Materials for the new level
    const upperFloorMaterial = new THREE.MeshStandardMaterial({
        color: 0x8f9e8b,
        side: THREE.DoubleSide
    });
    const sofaMaterial = new THREE.MeshStandardMaterial({
        color: 0x7b685b,
        roughness: 0.8
    });
    const kitchenMaterial = new THREE.MeshStandardMaterial({
        color: 0xe0e0e0,
        metalness: 0.7,
        roughness: 0.3
    });
    const microwaveMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.4
    });
    const gymMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.8,
        roughness: 0.6
    });
    const soilMaterial = new THREE.MeshStandardMaterial({
        color: 0x5c3d2e,
        roughness: 0.9
    });
    const plantMaterial = new THREE.MeshStandardMaterial({
        color: 0x4caf50,
        roughness: 0.7
    });

    const r_upper_floor = Math.sqrt(innerHabitatRadius ** 2 - upperLevelYFloor ** 2);
    const upperRingGeometry = new THREE.RingGeometry(innerRad, r_upper_floor, 64);
    const upperFloor = new THREE.Mesh(upperRingGeometry, upperFloorMaterial);
    upperFloor.position.y = upperLevelYFloor;
    upperFloor.rotation.x = -Math.PI / 2;
    upperLevel.add(upperFloor);

    // --- REPOSITIONED: Create Zones in the Upper Level ---
    const loungeAngle = Math.PI / 2;
    const kitchenAngle = -Math.PI / 1.5;
    const gymAngle = -Math.PI / 6;

    // Zone 1: Lounge with Sofas
    const loungeRadius = innerRad + (r_upper_floor - innerRad) * 0.4;
    const sofaGroup = new THREE.Group();
    const sofaMainGeom = new THREE.BoxGeometry(2.0, 0.4, 0.8);
    const sofaBackGeom = new THREE.BoxGeometry(2.0, 0.5, 0.2);
    const sofaMain = new THREE.Mesh(sofaMainGeom, sofaMaterial);
    sofaMain.position.y = 0.2;
    const sofaBack = new THREE.Mesh(sofaBackGeom, sofaMaterial);
    sofaBack.position.y = 0.4 + 0.25;
    sofaBack.position.z = -0.3;
    sofaGroup.add(sofaMain, sofaBack);
    sofaGroup.position.set(Math.cos(loungeAngle) * loungeRadius, upperLevelYFloor, Math.sin(loungeAngle) * loungeRadius);
    sofaGroup.rotation.y = -loungeAngle;
    upperLevel.add(sofaGroup);

    // Zone 2: Kitchenette
    const kitchenRadius = r_upper_floor - 0.9999;
    const kitchenGroup = new THREE.Group();
    const counterGeom = new THREE.BoxGeometry(2.5, 0.9, 0.6);
    const counter = new THREE.Mesh(counterGeom, kitchenMaterial);
    counter.position.y = 0.45;
    kitchenGroup.add(counter);
    const microwaveGeom = new THREE.BoxGeometry(0.6, 0.4, 0.5);
    const microwave = new THREE.Mesh(microwaveGeom, microwaveMaterial);
    microwave.position.y = 0.9 + 0.2;
    microwave.position.x = -0.6;
    kitchenGroup.add(microwave);
    const cupGeom = new THREE.CylinderGeometry(0.05, 0.04, 0.1, 16);
    const cup1 = new THREE.Mesh(cupGeom, new THREE.MeshStandardMaterial({
        color: 0xffffff
    }));
    cup1.position.set(0.2, 0.9 + 0.05, 0);
    const cup2 = cup1.clone();
    cup2.position.x = 0.4;
    kitchenGroup.add(cup1, cup2);
    kitchenGroup.position.set(Math.cos(kitchenAngle) * kitchenRadius, upperLevelYFloor, Math.sin(kitchenAngle) * kitchenRadius);
    kitchenGroup.rotation.y = -kitchenAngle + Math.PI / 2;
    upperLevel.add(kitchenGroup);

    // Zone 3: Gym & Garden
    const gymRadius = innerRad + (r_upper_floor - innerRad) * 0.7;
    // Treadmill
    const treadmillGroup = new THREE.Group();
    const baseGeom = new THREE.BoxGeometry(0.7, 0.1, 1.8);
    const consoleGeom = new THREE.BoxGeometry(0.7, 0.5, 0.1);
    const base = new THREE.Mesh(baseGeom, gymMaterial);
    const console = new THREE.Mesh(consoleGeom, gymMaterial);
    console.position.z = -0.85;
    console.position.y = 0.6;
    console.rotation.x = 0.2;
    treadmillGroup.add(base, console);
    treadmillGroup.position.set(Math.cos(gymAngle) * gymRadius, upperLevelYFloor + 0.05, Math.sin(gymAngle) * gymRadius);
    treadmillGroup.rotation.y = -gymAngle;
    upperLevel.add(treadmillGroup);
    // Garden
    const gardenAngle = gymAngle + 0.8; // Place it near the gym area
    const gardenRadius = r_upper_floor - 0.99;
    const gardenGroup = new THREE.Group();
    const planterGeom = new THREE.BoxGeometry(1.5, 0.4, 0.8);
    const planter = new THREE.Mesh(planterGeom, soilMaterial);
    gardenGroup.add(planter);
    for (let p = 0; p < 5; p++) {
        const plantGeom = new THREE.ConeGeometry(0.05, 0.2, 8);
        const plant = new THREE.Mesh(plantGeom, plantMaterial);
        plant.position.set((Math.random() - 0.5) * 1.3, 0.2 + 0.1, (Math.random() - 0.5) * 0.6);
        planter.add(plant);
    }
    gardenGroup.position.set(Math.cos(gardenAngle) * gardenRadius, upperLevelYFloor + 0.2, Math.sin(gardenAngle) * gardenRadius);
    gardenGroup.rotation.y = -gardenAngle;
    upperLevel.add(gardenGroup);

    scene.add(upperLevel);


    // --- Lower Technical & Purification Level ---
    const lowerLevel = new THREE.Group();
    lowerLevel.name = "LowerLevel";
    const techLevelHeight = 1.75;
    const techLevelYCeiling = -compartmentHeight / 2;
    const techLevelYCenter = techLevelYCeiling - techLevelHeight / 2;
    const techLevelYFloor = techLevelYCeiling - techLevelHeight;
    const techInnerRad = lssRadius;

    // Materials
    const techCompartmentMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        side: THREE.DoubleSide
    });
    const tankMaterialMethane = new THREE.MeshStandardMaterial({
        color: 0x785d4a,
        roughness: 0.7,
        metalness: 0.2
    });
    const tankMaterialWater = new THREE.MeshStandardMaterial({
        color: 0x6082B6,
        metalness: 0.3,
        roughness: 0.4
    });
    const tankMaterialStorage = new THREE.MeshStandardMaterial({
        color: 0x888888,
        metalness: 0.6,
        roughness: 0.2
    });
    const pumpMaterial = new THREE.MeshStandardMaterial({
        color: 0x666677,
        metalness: 0.8,
        roughness: 0.4
    });
    const panelMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.9,
        roughness: 0.5
    });
    const panelScreenMaterial = new THREE.MeshStandardMaterial({
        color: 0x000000,
        emissive: 0xff4500,
        emissiveIntensity: 0.8
    });


    const r_tech_floor = Math.sqrt(innerHabitatRadius ** 2 - techLevelYFloor ** 2);
    const techRingGeometry = new THREE.RingGeometry(techInnerRad, r_tech_floor, 64);

    const techFloor = new THREE.Mesh(techRingGeometry, techCompartmentMaterial);
    techFloor.rotation.x = -Math.PI / 2;
    techFloor.position.y = techLevelYFloor;
    lowerLevel.add(techFloor);

    const techInnerWallGeom = new THREE.CylinderGeometry(techInnerRad, techInnerRad, techLevelHeight, 64, 1, true);
    const techInnerWall = new THREE.Mesh(techInnerWallGeom, techCompartmentMaterial);
    techInnerWall.position.y = techLevelYCenter;
    lowerLevel.add(techInnerWall);

    const numTechChambers = 3;
    const tankHeight = 1.5;
    const tankGeom = new THREE.CylinderGeometry(0.8, 1.0, tankHeight, 32);

    const pumpGeom = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const panelGeom = new THREE.BoxGeometry(0.4, 0.6, 0.1);
    const panelScreenGeom = new THREE.BoxGeometry(0.3, 0.2, 0.02);
    const manifoldPipeGeom = new THREE.TorusGeometry((r_tech_floor + techInnerRad) / 2, 0.08, 16, 100);

    const manifold = new THREE.Mesh(manifoldPipeGeom, pipeMaterial);
    manifold.position.y = techLevelYCeiling - 0.2;
    manifold.rotation.x = Math.PI / 2;
    lowerLevel.add(manifold);

    const tankPositions = [];
    const pumpPositions = [];

    for (let i = 0; i < numTechChambers; i++) {
        const angle = i * (Math.PI * 2 / numTechChambers);
        const sectorAngle = Math.PI * 2 / numTechChambers;

        const contentAngle = angle + sectorAngle / 2;
        const contentRadius = techInnerRad + (r_tech_floor - techInnerRad) / 2;
        let chamberTank;

        if (i === 0) {
            chamberTank = new THREE.Mesh(tankGeom, tankMaterialMethane);
        } else if (i === 1) {
            chamberTank = new THREE.Mesh(tankGeom, tankMaterialWater);
        } else {
            chamberTank = new THREE.Mesh(tankGeom, tankMaterialStorage);
        }

        chamberTank.position.set(Math.cos(contentAngle) * contentRadius, techLevelYFloor + tankHeight / 2 + 0.1, Math.sin(contentAngle) * contentRadius);
        chamberTank.rotation.y = -contentAngle;
        lowerLevel.add(chamberTank);
        tankPositions.push(chamberTank.position.clone());

        const pumpAngle = angle + sectorAngle * 0.8;
        const pumpRadius = contentRadius - 0.5;
        const pump = new THREE.Mesh(pumpGeom, pumpMaterial);
        pump.position.set(Math.cos(pumpAngle) * pumpRadius, techLevelYFloor + 0.25, Math.sin(pumpAngle) * pumpRadius);
        pump.rotation.y = -pumpAngle;
        lowerLevel.add(pump);
        pumpPositions.push(pump.position.clone());

        const panelAngle = angle + sectorAngle * 0.2;
        const panel = new THREE.Mesh(panelGeom, panelMaterial);
        panel.position.set(Math.cos(panelAngle) * (techInnerRad + 0.05), techLevelYCenter, Math.sin(panelAngle) * (techInnerRad + 0.05));
        panel.rotation.y = -panelAngle + Math.PI / 2;
        lowerLevel.add(panel);

        const screen = new THREE.Mesh(panelScreenGeom, panelScreenMaterial);
        screen.position.z = 0.06; // Position relative to panel
        panel.add(screen);

        const vertPipeStart = chamberTank.position.clone();
        vertPipeStart.y += tankHeight / 2;
        const vertPipeEnd = new THREE.Vector3(
            Math.cos(contentAngle) * ((r_tech_floor + techInnerRad) / 2),
            manifold.position.y,
            Math.sin(contentAngle) * ((r_tech_floor + techInnerRad) / 2)
        );
        const vertPipeMid = vertPipeStart.clone().lerp(vertPipeEnd, 0.5);
        vertPipeMid.x *= 0.9;
        vertPipeMid.z *= 0.9;

        const vertPipeCurve = new THREE.QuadraticBezierCurve3(vertPipeStart, vertPipeMid, vertPipeEnd);
        const vertPipeGeom = new THREE.TubeGeometry(vertPipeCurve, 20, 0.06, 8, false);
        const vertPipe = new THREE.Mesh(vertPipeGeom, pipeMaterial);
        lowerLevel.add(vertPipe);
    }

    const lowerPipeRadius = 0.1;
    for (let i = 0; i < tankPositions.length; i++) {
        const startPoint1 = tankPositions[i].clone();
        startPoint1.y -= tankHeight / 2 - 0.3;
        const endPoint1 = pumpPositions[i].clone();

        const midPoint1 = startPoint1.clone().lerp(endPoint1, 0.5);
        midPoint1.y = techLevelYFloor + 0.1;

        const pipeCurve1 = new THREE.QuadraticBezierCurve3(startPoint1, midPoint1, endPoint1);
        const pipeGeom1 = new THREE.TubeGeometry(pipeCurve1, 20, lowerPipeRadius, 8, false);
        const pipe1 = new THREE.Mesh(pipeGeom1, pipeMaterial);
        lowerLevel.add(pipe1);

        const startPoint2 = pumpPositions[i].clone();
        const endPoint2 = tankPositions[(i + 1) % tankPositions.length].clone();
        endPoint2.y -= tankHeight / 2 - 0.35;

        const midPoint2 = startPoint2.clone().lerp(endPoint2, 0.5);
        midPoint2.y = techLevelYFloor + 0.15;
        midPoint2.multiplyScalar(1.05);

        const pipeCurve2 = new THREE.QuadraticBezierCurve3(startPoint2, midPoint2, endPoint2);
        const pipeGeom2 = new THREE.TubeGeometry(pipeCurve2, 20, lowerPipeRadius, 8, false);
        const pipe2 = new THREE.Mesh(pipeGeom2, pipeMaterial);
        lowerLevel.add(pipe2);
    }
    scene.add(lowerLevel);

    // --- REVISED: Lander Systems (Engines & Legs) ---
    const landerSystems = new THREE.Group();
    landerSystems.name = "LanderSystems";
    scene.add(landerSystems);

    const landerMaterial = new THREE.MeshStandardMaterial({
        color: 0x9999aa,
        metalness: 0.9,
        roughness: 0.4
    });
    const engineMaterial = new THREE.MeshStandardMaterial({
        color: 0x222228,
        metalness: 0.8,
        roughness: 0.6
    });
    const propellantTankMaterial = new THREE.MeshStandardMaterial({
        color: 0xff8c00,
        metalness: 0.5,
        roughness: 0.5
    });
    const pressurantTankMaterial = new THREE.MeshStandardMaterial({
        color: 0xcccccc,
        metalness: 0.8,
        roughness: 0.2
    });

    // 1. Engine Skirt - This solves the "popping out" issue by creating a dedicated compartment
    const skirtAttachY = -3.8;
    const skirtHeight = 2.2;
    const skirtTopRadius = Math.sqrt(outerHabitatRadius ** 2 - skirtAttachY ** 2);
    const skirtBottomRadius = skirtTopRadius - 0.8;
    const skirtGeom = new THREE.CylinderGeometry(skirtTopRadius, skirtBottomRadius, skirtHeight, 64, 1, true);
    const skirt = new THREE.Mesh(skirtGeom, landerMaterial);
    skirt.material.side = THREE.DoubleSide;
    skirt.position.y = skirtAttachY - skirtHeight / 2;
    landerSystems.add(skirt);

    // --- START: ADDED Insulation Layers ---
    const insulationGroup = new THREE.Group();
    scene.add(insulationGroup);

    // Define materials for the different insulation layers
    const mliMaterial = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        metalness: 0.95,
        roughness: 0.3,
        side: THREE.DoubleSide
    });
    const fibrousMaterial = new THREE.MeshStandardMaterial({
        color: 0xf5f5f5,
        roughness: 0.9,
        side: THREE.DoubleSide
    });
    const meshMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        wireframe: true,
        side: THREE.DoubleSide
    });

    const insulationLayers = [{
        radius: innerHabitatRadius - 0.05,
        material: mliMaterial
    }, // Gold foil layer (MLI)
    {
        radius: innerHabitatRadius - 0.10,
        material: fibrousMaterial
    }, // White fibrous layer
    {
        radius: innerHabitatRadius - 0.15,
        material: meshMaterial
    }, // Inner structural mesh
    ];

    // Calculate the vertical angles (phi) for the spherical segment
    // Phi=0 is top pole, Phi=PI is bottom pole.
    // We use acos(y / radius) to find the angle for a given height.
    const phiStart = Math.acos(techLevelYFloor / innerHabitatRadius);
    const phiEnd = Math.acos(skirtAttachY / innerHabitatRadius);
    const phiLength = phiEnd - phiStart;

    insulationLayers.forEach(layer => {
        const insulationGeom = new THREE.SphereGeometry(
            layer.radius,
            64, 32, // Segments
            0, Math.PI * 2, // Theta (horizontal angle)
            phiStart, phiLength // Phi (vertical angle start and length)
        );
        const insulationMesh = new THREE.Mesh(insulationGeom, layer.material);
        insulationGroup.add(insulationMesh);
    });

    // --- START: ADDED External Airlock Door Outline ---
    const doorHeight = 2.0;
    const doorWidth = 0.9;
    const cornerRadius = doorWidth / 2;

    // Create a capsule/stadium shape for the door outline
    const doorPath = new THREE.Path();
    doorPath.moveTo(-doorWidth / 2, -doorHeight / 2 + cornerRadius);
    doorPath.lineTo(-doorWidth / 2, doorHeight / 2 - cornerRadius);
    doorPath.absarc(0, doorHeight / 2 - cornerRadius, cornerRadius, Math.PI, 0, true);
    doorPath.lineTo(doorWidth / 2, -doorHeight / 2 + cornerRadius);
    doorPath.absarc(0, -doorHeight / 2 + cornerRadius, cornerRadius, 0, Math.PI, true);

    const doorGeom = new THREE.BufferGeometry().setFromPoints(doorPath.getPoints(50));
    const doorMaterial = new THREE.LineBasicMaterial({
        color: 0xff0000 // MODIFIED: Changed color to bright red for visibility
    });
    const airlockDoor = new THREE.LineLoop(doorGeom, doorMaterial);

    // Position the door on the spherical insulation layer
    const airlockWallRadius = innerHabitatRadius - 0.05 + 0.01; // Just outside the gold foil layer
    const doorCenterY = (techLevelYFloor + skirtAttachY) / 2; // Vertically centered on the insulation band

    // Check if the Y position is valid for the given sphere radius
    if (airlockWallRadius ** 2 > doorCenterY ** 2) {
        const radiusAtDoorY = Math.sqrt(airlockWallRadius ** 2 - doorCenterY ** 2);
        const doorHorizontalAngle = 0; // Place on the +X axis side of the habitat

        const doorPosition = new THREE.Vector3(
            Math.cos(doorHorizontalAngle) * radiusAtDoorY,
            doorCenterY,
            Math.sin(doorHorizontalAngle) * radiusAtDoorY
        );

        airlockDoor.position.copy(doorPosition);

        // Orient the door to be tangent to the sphere's surface
        airlockDoor.lookAt(0, 0, 0); // Orients the door to face the center of the sphere
        airlockDoor.rotateY(Math.PI); // Flips it 180 degrees to face outwards

        insulationGroup.add(airlockDoor); // Add the door to the insulation group
    }
    // --- END: ADDED External Airlock Door Outline ---

    // --- END: ADDED Insulation Layers ---

    // 2. Engine Cluster
    const engineCluster = new THREE.Group();
    landerSystems.add(engineCluster);
    const numEngines = 4;
    const enginePlacementRadius = skirtBottomRadius * 1;
    const engineBaseY = skirt.position.y - skirtHeight / 2;
    const enginePositions = [];

    // Helper function to create one engine
    function createEngine() {
        const engineGroup = new THREE.Group();
        const nozzleGeom = new THREE.CylinderGeometry(0.2, 0.6, 1.0, 24);
        const nozzle = new THREE.Mesh(nozzleGeom, engineMaterial);
        nozzle.position.y = -0.5;
        engineGroup.add(nozzle);
        const blockGeom = new THREE.CylinderGeometry(0.3, 0.3, 0.4, 24);
        const block = new THREE.Mesh(blockGeom, landerMaterial);
        block.position.y = 0.2;
        engineGroup.add(block);
        return engineGroup;
    }

    for (let i = 0; i < numEngines; i++) {
        const angle = i * (Math.PI * 2 / numEngines);
        const engine = createEngine();
        const x = Math.cos(angle) * enginePlacementRadius;
        const z = Math.sin(angle) * enginePlacementRadius;
        engine.position.set(x, engineBaseY, z);
        enginePositions.push(engine.position.clone());
        engineCluster.add(engine);
    }

    // 3. Landing Legs
    const numLegs = 4;
    const legProto = new THREE.Group();

    // Strut remains the same
    const strutGeom = new THREE.BoxGeometry(0.25, 0.25, 6.0);
    const strut = new THREE.Mesh(strutGeom, landerMaterial);
    strut.position.z = 6.0 / 2;
    legProto.add(strut);

    // *** ADD a hoof-like tip using a ConeGeometry ***
    const hoofGeom = new THREE.ConeGeometry(0.3, 0.5, 8); // (radius, height, segments)
    const hoof = new THREE.Mesh(hoofGeom, landerMaterial);
    hoof.rotation.x = Math.PI / 2; // Rotate the cone to point outwards along the leg
    hoof.position.z = 6.0 + (0.5 / 2); // Position it at the very end of the strut
    legProto.add(hoof);

    const landingY = -outerHabitatRadius - 2.5;
    const landingRadius = 7.0;

    for (let i = 0; i < numLegs; i++) {
        const leg = legProto.clone();
        const angle = (i * (Math.PI * 2 / numLegs)) + Math.PI / 4;

        const attachPos = new THREE.Vector3(Math.cos(angle) * skirtTopRadius, skirtAttachY, Math.sin(angle) * skirtTopRadius);
        leg.position.copy(attachPos);

        const targetPos = new THREE.Vector3(Math.cos(angle) * landingRadius, landingY, Math.sin(angle) * landingRadius);

        leg.lookAt(targetPos);

        landerSystems.add(leg);
    }

    // 4. Added Machinery and Details
    const machineryGroup = new THREE.Group();
    landerSystems.add(machineryGroup);

    // Propellant Tanks
    const pTankGeom = new THREE.SphereGeometry(0.8, 32, 16);
    const tank1 = new THREE.Mesh(pTankGeom, propellantTankMaterial);
    const tank2 = new THREE.Mesh(pTankGeom, propellantTankMaterial);
    const pTankRadius = skirtTopRadius * 0.6;
    const pTankY = skirt.position.y + skirtHeight / 2 - 0.8;
    tank1.position.set(pTankRadius, pTankY, 0);
    tank2.position.set(-pTankRadius, pTankY, 0);
    machineryGroup.add(tank1, tank2);

    // Pressurant Tanks (Helium)
    const hTankGeom = new THREE.SphereGeometry(0.4, 16, 8);
    const hTank1 = new THREE.Mesh(hTankGeom, pressurantTankMaterial);
    const hTank2 = new THREE.Mesh(hTankGeom, pressurantTankMaterial);
    hTank1.position.set(0, pTankY, pTankRadius);
    hTank2.position.set(0, pTankY, -pTankRadius);
    machineryGroup.add(hTank1, hTank2);

    // Central Manifold & Truss Structure
    const manifoldGeom = new THREE.TorusGeometry(enginePlacementRadius, 0.15, 16, 64);
    const manifoldMesh = new THREE.Mesh(manifoldGeom, landerMaterial);
    manifoldMesh.position.y = engineBaseY + 0.6;
    manifoldMesh.rotation.x = Math.PI / 2;
    machineryGroup.add(manifoldMesh);

    // Piping
    const enginePipeRadius = 0.05;
    const mainPipeRadius = 0.1;
    // Pipe from tanks to manifold
    const t1_to_m_curve = new THREE.CatmullRomCurve3([tank1.position.clone().add(new THREE.Vector3(-0.8, 0, 0)), new THREE.Vector3(0, pTankY - 0.5, 0), manifoldMesh.position.clone().add(new THREE.Vector3(enginePlacementRadius, 0, 0))]);
    const t2_to_m_curve = new THREE.CatmullRomCurve3([tank2.position.clone().add(new THREE.Vector3(0.8, 0, 0)), new THREE.Vector3(0, pTankY - 0.5, 0), manifoldMesh.position.clone().add(new THREE.Vector3(-enginePlacementRadius, 0, 0))]);
    machineryGroup.add(new THREE.Mesh(new THREE.TubeGeometry(t1_to_m_curve, 20, mainPipeRadius, 8), pipeMaterial));
    machineryGroup.add(new THREE.Mesh(new THREE.TubeGeometry(t2_to_m_curve, 20, mainPipeRadius, 8), pipeMaterial));

    // Pipes from manifold to each engine
    enginePositions.forEach(enginePos => {
        const start = manifoldMesh.position.clone();
        start.x = enginePos.x;
        start.z = enginePos.z;
        const end = enginePos.clone().add(new THREE.Vector3(0, 0.2, 0)); // Connect to engine block
        const mid = start.clone().lerp(end, 0.5);
        mid.y += 0.2;
        const pipeCurve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const pipe = new THREE.Mesh(new THREE.TubeGeometry(pipeCurve, 10, enginePipeRadius, 8), pipeMaterial);
        machineryGroup.add(pipe);
    });

    // ACS Thruster Blocks
    const numAcs = 4;
    for (let i = 0; i < numAcs; i++) {
        const acsBlock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.4, 0.4), landerMaterial);
        const angle = (i * Math.PI * 2 / numAcs) + Math.PI / 4;
        const acsRadius = skirtTopRadius - 0.25;
        acsBlock.position.set(Math.cos(angle) * acsRadius, skirt.position.y, Math.sin(angle) * acsRadius);
        acsBlock.lookAt(0, skirt.position.y, 0);
        landerSystems.add(acsBlock);
    }

    // --- MODIFIED: Symmetrical Solar Panel Wings ---

    function createSolarPanelTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 128;
        const context = canvas.getContext('2d');
        context.fillStyle = '#112244'; // Base color for cells
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#335599'; // Grid lines
        context.lineWidth = 4;
        for (let i = 8; i < canvas.width; i += 16) {
            context.beginPath();
            context.moveTo(i, 0);
            context.lineTo(i, canvas.height);
            context.stroke();
        }
        for (let j = 8; j < canvas.height; j += 16) {
            context.beginPath();
            context.moveTo(0, j);
            context.lineTo(canvas.width, j);
            context.stroke();
        }
        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        return texture;
    }

    const solarPanelMaterial = new THREE.MeshStandardMaterial({
        map: createSolarPanelTexture(),
        color: 0x334466, // Bluish color for the panels
        metalness: 0.8,
        roughness: 0.3,
        side: THREE.DoubleSide
    });

    // Helper function to build one symmetrical solar wing
    function createSymmetricalSolarWing() {
        const wing = new THREE.Group();
        const panelGroup = new THREE.Group();
        wing.add(panelGroup);

        const yokeGeom = new THREE.CylinderGeometry(0.2, 0.2, 1.0, 16);
        const yoke = new THREE.Mesh(yokeGeom, landerMaterial);
        yoke.rotation.x = Math.PI / 2;
        wing.add(yoke);

        const numSegments = 4;
        const segmentWidth = 2.5;
        const segmentHeight = 3.0; // Constant height for all segments
        const panelThickness = 0.05;
        let currentX = 0;

        for (let i = 0; i < numSegments; i++) {
            const shape = new THREE.Shape();
            // Define a simple rectangle shape for this segment
            shape.moveTo(0, -segmentHeight / 2);
            shape.lineTo(segmentWidth, -segmentHeight / 2);
            shape.lineTo(segmentWidth, segmentHeight / 2);
            shape.lineTo(0, segmentHeight / 2);
            shape.closePath();

            const geom = new THREE.ExtrudeGeometry(shape, {
                depth: panelThickness,
                bevelEnabled: false
            });
            const panel = new THREE.Mesh(geom, solarPanelMaterial);
            panel.position.x = currentX;
            panelGroup.add(panel);

            // Add a small frame element between panels
            const frameGeom = new THREE.BoxGeometry(0.05, segmentHeight, panelThickness + 0.02);
            const frame = new THREE.Mesh(frameGeom, landerMaterial);
            frame.position.x = currentX;
            panelGroup.add(frame);

            currentX += segmentWidth;
        }

        // Sweep the entire wing assembly back slightly
        panelGroup.rotation.y = -Math.PI / 16;

        return wing;
    }

    const solarWing1 = createSymmetricalSolarWing();
    solarWing1.position.set(outerHabitatRadius - 0.2, 0.5, 0);
    solarWing1.rotation.z = Math.PI / 10; // Positive angle to point UP
    scene.add(solarWing1);

    const solarWing2 = solarWing1.clone();
    solarWing2.position.x *= -1;
    // Make the second wing's angle identical to the first for an upward "V"
    solarWing2.rotation.z = solarWing1.rotation.z;
    solarWing2.rotation.y = Math.PI; // Flip it for the other side
    scene.add(solarWing2);

    // --- START: RESTORED Ladder and Hatch to access lower level ---
    const ladderGroup = new THREE.Group();
   
    const lowerHatchRadius = 0.4;
    const lowerHatchAngle = Math.PI * 1.2; // Repositioned to avoid other elements
    const lowerHatchRingRadius = (innerRad + outerRad) * 0.45;
    const lowerHatchFloorY = -compartmentHeight / 2;

    ladderGroup.position.set(
        Math.cos(lowerHatchAngle) * lowerHatchRingRadius,
        lowerHatchFloorY,
        Math.sin(lowerHatchAngle) * lowerHatchRingRadius
    );
    scene.add(ladderGroup);

    const lowerHatchOutlineGeom = new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, lowerHatchRadius, 0, Math.PI * 2, false).getPoints(50)
    );
    const lowerHatchOutlineMaterial = new THREE.LineBasicMaterial({
        color: 0x333333
    });
    const lowerHatchOutline = new THREE.LineLoop(lowerHatchOutlineGeom, lowerHatchOutlineMaterial);
    lowerHatchOutline.position.copy(ladderGroup.position);
    lowerHatchOutline.position.y += 0.02; // Place on top of the floor
    lowerHatchOutline.rotation.x = Math.PI / 2;
    scene.add(lowerHatchOutline);

    const ladderHeight = techLevelYCeiling - techLevelYFloor;
    const ropeRadius = 0.03;
    const ropeGeom = new THREE.CylinderGeometry(ropeRadius, ropeRadius, ladderHeight, 8);
    const ropeMaterial = new THREE.MeshStandardMaterial({
        color: 0x5C3D2E,
        roughness: 0.9
    });
   
    const rope1 = new THREE.Mesh(ropeGeom, ropeMaterial);
    rope1.position.set(-lowerHatchRadius + 0.1, -ladderHeight / 2, 0);
    const rope2 = new THREE.Mesh(ropeGeom, ropeMaterial);
    rope2.position.set(lowerHatchRadius - 0.1, -ladderHeight / 2, 0);
   
    ladderGroup.add(rope1);
    ladderGroup.add(rope2);

    const numRungs = 6;
    const rungRadius = 0.025;
    const rungLength = (lowerHatchRadius - 0.1) * 2;
    const rungGeom = new THREE.CylinderGeometry(rungRadius, rungRadius, rungLength, 8);
    const rungMaterial = new THREE.MeshStandardMaterial({
        color: 0x966F33,
        metalness: 0.2,
        roughness: 0.7
    });

    for (let i = 0; i < numRungs; i++) {
        const rung = new THREE.Mesh(rungGeom, rungMaterial);
        const yPos = -0.2 - i * ((ladderHeight - 0.4) / (numRungs - 1));
        rung.position.y = yPos;
        rung.rotation.z = Math.PI / 2;
        ladderGroup.add(rung);
    }
   
    ladderGroup.rotation.y = -lowerHatchAngle + Math.PI / 2;
    // --- END: RESTORED Ladder and Hatch ---
    // --- REVISED: Spiral Staircase and Hatches ---
    const stairMaterial = new THREE.MeshStandardMaterial({
        color: 0x444444,
        metalness: 0.8,
        roughness: 0.6
    });
    const hatchRadius = 0.6;
    const staircaseGroup = new THREE.Group();

    // Define staircase position
    const staircaseAngle = Math.PI * 1.8;
    const staircaseRingRadius = innerRad + hatchRadius + 0.2;
    staircaseGroup.position.set(
        Math.cos(staircaseAngle) * staircaseRingRadius, -compartmentHeight / 2,
        Math.sin(staircaseAngle) * staircaseRingRadius
    );
    scene.add(staircaseGroup);

    // Create aligned hatch outlines
    const hatchOutlineGeom = new THREE.BufferGeometry().setFromPoints(
        new THREE.Path().absarc(0, 0, hatchRadius, 0, Math.PI * 2, false).getPoints(50)
    );
    const hatchOutlineMaterial = new THREE.LineBasicMaterial({
        color: 0x333333
    });
    const ceilingHatch = new THREE.LineLoop(hatchOutlineGeom, hatchOutlineMaterial);
    ceilingHatch.position.copy(staircaseGroup.position);
    ceilingHatch.position.y = compartmentHeight / 2 - 0.01; // ceiling
    ceilingHatch.rotation.x = Math.PI / 2;
    scene.add(ceilingHatch);

    const upperFloorHatch = new THREE.LineLoop(hatchOutlineGeom, hatchOutlineMaterial);
    upperFloorHatch.position.copy(staircaseGroup.position);
    upperFloorHatch.position.y = compartmentHeight / 2 + 0.01; // upper floor
    upperFloorHatch.rotation.x = Math.PI / 2;
    scene.add(upperFloorHatch);

    // Build the spiral staircase
    const stepHeight = 0.2;
    const numSteps = Math.floor(compartmentHeight / stepHeight);
    const stepGeom = new THREE.BoxGeometry(hatchRadius * 0.9, 0.05, 0.3);
    const poleGeom = new THREE.CylinderGeometry(0.1, 0.1, compartmentHeight, 16);
    const pole = new THREE.Mesh(poleGeom, stairMaterial);
    pole.position.y = compartmentHeight / 2;
    staircaseGroup.add(pole);

    for (let i = 0; i <= numSteps; i++) {
        const step = new THREE.Mesh(stepGeom, stairMaterial);
        const yPos = i * stepHeight;
        const angle = (i / numSteps) * Math.PI * 2.5; // Controls how much the stair spirals
        step.position.y = yPos;
        step.position.x = Math.cos(angle) * hatchRadius * 0.5;
        step.position.z = Math.sin(angle) * hatchRadius * 0.5;
        step.rotation.y = -angle;
        staircaseGroup.add(step);
    }


    // --- Electrical System ---
    const electricalGroup = new THREE.Group();
    scene.add(electricalGroup);

    const conduitMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        metalness: 0.8,
        roughness: 0.5
    });
    const powerUnitMaterial = new THREE.MeshStandardMaterial({
        color: 0x004d40,
        metalness: 0.6,
        roughness: 0.4
    });
    const batteryMaterial = new THREE.MeshStandardMaterial({
        color: 0x00695c,
        metalness: 0.7,
        roughness: 0.3
    });
    const lightMaterial = new THREE.MeshStandardMaterial({
        color: 0xffeb3b,
        emissive: 0xffeb3b,
        emissiveIntensity: 1
    });

    // 1. Junction Boxes at the end of the solar wings
    const jBoxGeom = new THREE.BoxGeometry(0.3, 0.4, 0.4);
    const junctionBox1 = new THREE.Mesh(jBoxGeom, landerMaterial);
    junctionBox1.position.set(outerHabitatRadius - 0.15, 0.5, 0);
    electricalGroup.add(junctionBox1);

    const junctionBox2 = new THREE.Mesh(jBoxGeom, landerMaterial);
    junctionBox2.position.set(-(outerHabitatRadius - 0.15), 0.5, 0);
    electricalGroup.add(junctionBox2);

    // 2. Power Distribution Unit in the lower skirt compartment
    const powerUnit = new THREE.Group();
    powerUnit.position.y = skirt.position.y;
    electricalGroup.add(powerUnit);

    const mainCabinet = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1.2, 1.5),
        powerUnitMaterial
    );
    mainCabinet.position.y = 0.6;
    powerUnit.add(mainCabinet);

    const batteryPack1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 1.3), batteryMaterial);
    batteryPack1.position.set(0.85, 0.5, 0);
    powerUnit.add(batteryPack1);

    const batteryPack2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 1.3), batteryMaterial);
    batteryPack2.position.set(-0.85, 0.5, 0);
    powerUnit.add(batteryPack2);

    const statusLight = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), lightMaterial);
    statusLight.position.set(0, 0.8, 0.78);
    powerUnit.add(statusLight);

    // 3. External wiring from Junction Boxes to the Power Unit
    const conduitRadius = 0.08;
    const conduitTargetY = skirt.position.y + skirtHeight / 2 - 0.2;
    const conduitTargetRadius = skirtTopRadius - 0.3;

    // Wire 1
    const p1_start = junctionBox1.position.clone();
    const p1_mid = new THREE.Vector3(
        Math.cos(Math.PI / 8) * (outerHabitatRadius + 0.2), -2.0,
        Math.sin(Math.PI / 8) * (outerHabitatRadius + 0.2)
    );
    const p1_end = new THREE.Vector3(conduitTargetRadius, conduitTargetY, 0);
    const curve1 = new THREE.CatmullRomCurve3([p1_start, p1_mid, p1_end]);
    const conduit1 = new THREE.Mesh(new THREE.TubeGeometry(curve1, 32, conduitRadius, 8, false), conduitMaterial);
    electricalGroup.add(conduit1);

    // Wire 2
    const p2_start = junctionBox2.position.clone();
    const p2_mid = new THREE.Vector3(-Math.cos(Math.PI / 8) * (outerHabitatRadius + 0.2), -2.0,
        Math.sin(Math.PI / 8) * (outerHabitatRadius + 0.2)
    );
    const p2_end = new THREE.Vector3(-conduitTargetRadius, conduitTargetY, 0);
    const curve2 = new THREE.CatmullRomCurve3([p2_start, p2_mid, p2_end]);
    const conduit2 = new THREE.Mesh(new THREE.TubeGeometry(curve2, 32, conduitRadius, 8, false), conduitMaterial);
    electricalGroup.add(conduit2);

    // 4. Internal Power Trunk from Power Unit up to the LSS Core
    const trunkStart = mainCabinet.position.clone().add(powerUnit.position);
    trunkStart.y += 0.6; // Top of the cabinet
    const trunkEnd = new THREE.Vector3(0, techLevelYFloor, lssRadius); // Connect to base of LSS on tech floor
    const trunkMid = trunkStart.clone().lerp(trunkEnd, 0.5);
    trunkMid.z += 1.5;

    const trunkCurve = new THREE.QuadraticBezierCurve3(trunkStart, trunkMid, trunkEnd);
    const mainTrunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 20, 0.15, 12, false), conduitMaterial);
    electricalGroup.add(mainTrunk);


    // --- Martian Ground ---
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x7a3a2a,
        roughness: 0.9,
        metalness: 0.1
    }); // Reddish-brown Mars soil
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2; // Rotate to be horizontal
    ground.position.y = -outerHabitatRadius - 2.8; // Place it just below the habitat legs
    scene.add(ground);

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize, false);

    // Check if the toggle button exists before adding an event listener
    const viewToggleButton = document.getElementById('viewToggle');
    if (viewToggleButton) {
        viewToggleButton.addEventListener('click', toggleView);
    }
}

function toggleView() {
    isTransparentView = !isTransparentView;
    const viewToggleButton = document.getElementById('viewToggle');

    if (isTransparentView) {
        habitatOuter.material.transparent = true;
        habitatOuter.material.opacity = 0.15;
        habitatOuter.material.needsUpdate = true;
        if (outerWireframe) {
            outerWireframe.material.transparent = true;
            outerWireframe.material.opacity = 0.3;
            outerWireframe.material.needsUpdate = true;
        }
        if (viewToggleButton) viewToggleButton.innerText = 'Toggle Outer View';
    } else {
        habitatOuter.material.transparent = false;
        habitatOuter.material.opacity = 1;
        habitatOuter.material.needsUpdate = true;
        if (outerWireframe) {
            outerWireframe.material.transparent = false;
            outerWireframe.material.opacity = 1;
            outerWireframe.material.needsUpdate = true;
        }
        if (viewToggleButton) viewToggleButton.innerText = 'Toggle Transparent View';
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    // This line is for the camera controls ONLY.
    // It does not rotate any objects in the scene.
    controls.update();

    // This line draws everything.
    renderer.render(scene, camera);
}