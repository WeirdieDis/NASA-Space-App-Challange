let scene, camera, renderer, controls;
let zones = [];
let selectedZone = null;
let mouse = new THREE.Vector2();
let raycaster = new THREE.Raycaster();

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(10, 10, 20);

    renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 20, 10);
    scene.add(light);

    // Habitat cylinder
    const habitatGeometry = new THREE.CylinderGeometry(5, 5, 15, 32, 1, true);
    const habitatMaterial = new THREE.MeshBasicMaterial({color: 0x5555ff, wireframe: true, opacity: 0.5, transparent: true});
    const habitat = new THREE.Mesh(habitatGeometry, habitatMaterial);
    habitat.rotation.z = Math.PI / 2;
    scene.add(habitat);

    // Functional zones
    const colors = {sleep: 0xff0000, hygiene: 0x00ff00, exercise: 0xffff00, food: 0xffa500, lifeSupport: 0x00ffff};
    const sizes = {sleep: [3, 2, 2], hygiene: [2, 2, 2], exercise: [2, 2, 2], food: [2, 2, 2], lifeSupport: [2, 2, 2]};
    let x = -4;
    for (let key in colors) {
        const geom = new THREE.BoxGeometry(...sizes[key]);
        const mat = new THREE.MeshStandardMaterial({color: colors[key], opacity: 0.8, transparent: true});
        const box = new THREE.Mesh(geom, mat);
        box.position.set(x, 0, 0);
        box.userData = {type: key, volume: sizes[key][0]*sizes[key][1]*sizes[key][2]};
        zones.push(box);
        scene.add(box);
        x += 2.5;
    }

    updateVolumeInfo();

    // Event listeners
    window.addEventListener('resize', onWindowResize, false);
    window.addEventListener('pointerdown', onPointerDown, false);
    window.addEventListener('pointerup', onPointerUp, false);
    window.addEventListener('pointermove', onPointerMove, false);
}

function updateVolumeInfo() {
    let total = zones.reduce((sum, z) => sum + z.userData.volume, 0);
    document.getElementById('volumeInfo').innerText = `Total occupied volume: ${total} cubic meters`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onPointerDown(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(zones);
    if (intersects.length > 0) selectedZone = intersects[0].object;
}

function onPointerUp(event) {
    selectedZone = null;
}

function onPointerMove(event) {
    if (!selectedZone) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZ, intersectPoint);
    selectedZone.position.x = intersectPoint.x;
    selectedZone.position.y = intersectPoint.y;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}
