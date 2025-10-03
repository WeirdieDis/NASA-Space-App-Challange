let scene, camera, renderer, controls;
let habitatInner, habitatOuter; // References to our two spheres
let isTransparentView = false; // State for the view toggle

init();
animate();

function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x101020);

    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 8, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Controls - Allows you to orbit the camera
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

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
    const innerHabitatRadius = 4.8; // Slightly smaller to fit inside outer shell
    const innerHabitatGeometry = new THREE.SphereGeometry(innerHabitatRadius, 32, 16);
    const innerHabitatMaterial = new THREE.MeshStandardMaterial({
        map: fabricTexture,
        color: 0xcccccc, // Lighter color for inner structure
        transparent: true,
        opacity: 0.5, // Always semi-transparent
        side: THREE.DoubleSide
    });
    habitatInner = new THREE.Mesh(innerHabitatGeometry, innerHabitatMaterial);
    habitatInner.name = 'HabitatInner'; // Give it a name for easier identification
    scene.add(habitatInner);
    
    // Wireframe for the inner habitat
    const innerWireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(innerHabitatGeometry),
        new THREE.LineBasicMaterial({ color: 0x00bbff, linewidth: 1 })
    );
    scene.add(innerWireframe);


    // 2. Outer Shell (Regolith / Composite Protection Layer)
    const outerHabitatRadius = 5; // Slightly larger than the inner one
    const outerHabitatGeometry = new THREE.SphereGeometry(outerHabitatRadius, 32, 16);
    // Material representing regolith or composite shell
    const outerHabitatMaterial = new THREE.MeshStandardMaterial({
        color: 0x8B4513, // Earthy brown for regolith, or 0x696969 for a composite grey
        roughness: 0.8,
        metalness: 0.1,
        transparent: false, // Starts opaque
        opacity: 1,
        side: THREE.FrontSide // Only render outer face by default
    });
    habitatOuter = new THREE.Mesh(outerHabitatGeometry, outerHabitatMaterial);
    habitatOuter.name = 'HabitatOuter';
    scene.add(habitatOuter);
    
    // Wireframe for the outer habitat
    const outerWireframe = new THREE.LineSegments(
        new THREE.EdgesGeometry(outerHabitatGeometry),
        new THREE.LineBasicMaterial({ color: 0x888800, linewidth: 1 }) // Yellowish for outer shell
    );
    scene.add(outerWireframe);

    // --- Event Listeners ---
    window.addEventListener('resize', onWindowResize, false);

    // Toggle Button
    document.getElementById('viewToggle').addEventListener('click', toggleView);
}

function toggleView() {
    isTransparentView = !isTransparentView;
    if (isTransparentView) {
        // Transparent View: Outer shell becomes very transparent
        habitatOuter.material.transparent = true;
        habitatOuter.material.opacity = 0.1; // Make it nearly invisible
        document.getElementById('viewToggle').innerText = 'Toggle Outer View';
    } else {
        // Outer View: Outer shell becomes opaque
        habitatOuter.material.transparent = false;
        habitatOuter.material.opacity = 1; // Fully opaque
        document.getElementById('viewToggle').innerText = 'Toggle Transparent View';
    }
    // Ensure material needs to be updated in the renderer
    habitatOuter.material.needsUpdate = true;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Required for smooth damping of controls
    renderer.render(scene, camera);
}