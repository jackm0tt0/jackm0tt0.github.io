import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// setup scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 10.5;
scene.background = new THREE.Color(0x111111);

//create renderer and add it to canvas container
const renderer = new THREE.WebGLRenderer();
const canvasContainer = document.querySelector('.canvas-container');
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
canvasContainer.appendChild(renderer.domElement);

//add lights
const directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
const pos = new THREE.Vector3(10,5,30);
directionalLight.position.copy(pos);
scene.add( directionalLight );

// create loader
const loader = new GLTFLoader();

// Load the cell mesh
const cell_mat = new THREE.MeshBasicMaterial({color: 0x222222, transparent: true, opacity: 0.50})
cell_mat.side = THREE.DoubleSide;

const wf_mat = new THREE.LineBasicMaterial({ color: 0x666666 , linewidth: 1000});

loader.load( './public/models/cells.gltf', function ( cell_mesh ) {
    for ( let i = 0; i < cell_mesh.scene.children.length; i++){
        //set child material
        cell_mesh.scene.children[i].material = cell_mat;

        // add wireframe
        const wf_geom = new THREE.WireframeGeometry(cell_mesh.scene.children[i].geometry);
        const wf = new THREE.LineSegments(wf_geom, wf_mat);
        scene.add(wf);
    }
    
	scene.add( cell_mesh.scene );
    renderer.render(scene, camera);

}, undefined, function ( error ) {
	console.error( error );
} );

// Load the decoration mesh
const deco_mat = new THREE.MeshStandardMaterial({color: 0xffffff})

loader.load( './public/models/decoration.gltf', function ( deco_mesh ) {
    for ( let i = 0; i < deco_mesh.scene.children.length; i++){
        deco_mesh.scene.children[i].material = deco_mat;
    }
    
	scene.add( deco_mesh.scene );
    renderer.render(scene, camera);
}, undefined, function ( error ) {
	console.error( error );
} );

// Function to handle scroll events
function onScroll(event) {

    const scroll_factor = -11.7;

    //x scroll
    const scrollX = window.scrollX;
    camera.position.x = scrollX / canvasContainer.clientWidth * scroll_factor;

    //y scroll
    const scrollY = window.scrollY;
    camera.position.y = scrollY / canvasContainer.clientWidth * scroll_factor;

    //rerender
    renderer.render(scene, camera);
}

// Add a scroll event listener to trigger the onScroll function
window.addEventListener('scroll', onScroll);


// Function for resize events
function onResize(even) {
    // Update the renderer size to match the container's current dimensions
    // renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    
    onScroll();
    
    // Update the camera's aspect ratio if needed (important for perspective cameras)
    camera.aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
    // hFOV to vFOV
    const hFOV = 58;
    const vFOV = (2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(hFOV) / 2) / camera.aspect)) * THREE.MathUtils.RAD2DEG;
    camera.fov = vFOV;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);

    // fix the scroll location
    document.y = 10
}

// Update the renderer size when the window is resized
window.addEventListener('resize', onResize);

//other main setup
onScroll(true);
onResize(true);