import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// setup scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 5;
scene.background = new THREE.Color(0x222222);

//create renderer and add it to canvas container
const renderer = new THREE.WebGLRenderer();
const canvasContainer = document.querySelector('.canvas-container');
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
canvasContainer.appendChild(renderer.domElement);

//add lights
const directionalLight = new THREE.DirectionalLight( 0xffffff, 0.5 );
const pos = new THREE.Vector3(10,5,30);
directionalLight.position.copy(pos);
scene.add( directionalLight );

// Load custom 3d Model
const loader = new GLTFLoader();
const material2 = new THREE.MeshBasicMaterial({color: 0xffffff, transparent: true, opacity: 0.05})
material2.side = THREE.DoubleSide;

// Load the cell mesh
loader.load( './public/models/cells.gltf', function ( cell_mesh ) {
    for ( let i = 0; i < cell_mesh.scene.children.length; i++){
        cell_mesh.scene.children[i].material = material2;
    }
    
	scene.add( cell_mesh.scene );
    // scene.children[1].children[0].material = c_material;
    renderer.render(scene, camera);
}, undefined, function ( error ) {
	console.error( error );
} );

// Function to handle scroll events
// move camera with scroll
function onScroll(event) {
    const scrollY = window.scrollY;
    console.log(window.clientWidth)
    camera.position.y = scrollY / canvasContainer.clientWidth * -10;
    renderer.render(scene, camera);
}

// Add a scroll event listener to trigger the onScroll function
window.addEventListener('scroll', onScroll);

// Update the renderer size when the window is resized
window.addEventListener('resize', () => {
    // Update the renderer size to match the container's current dimensions
    // renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    camera.position.y = scrollY / canvasContainer.clientWidth * -10;
    
    // Update the camera's aspect ratio if needed (important for perspective cameras)
    camera.aspect = canvasContainer.offsetWidth / canvasContainer.offsetHeight;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
});