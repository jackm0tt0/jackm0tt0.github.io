import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Settings
const light_color = 0xffffff;
const light_target = new THREE.Vector3(10,5,30);
const light_intesity = 3;

const cell_color = 0x113322;
const cell_op = 0.7;

const wire_color = 0x888888;

const deco_color = 0xdddddd;


// setup scene
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 10.5;
scene.background = new THREE.Color(0x082416);

//create renderer and add it to canvas container
const renderer = new THREE.WebGLRenderer();
const canvasContainer = document.querySelector('.canvas-container');
renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
renderer.sortObjects = false;
canvasContainer.appendChild(renderer.domElement);

//add lights
const directionalLight = new THREE.DirectionalLight( light_color, light_intesity );
directionalLight.position.copy(light_target);
scene.add( directionalLight );

// create loader
const loader = new GLTFLoader();

// Load the cell mesh
const cell_mat = new THREE.MeshBasicMaterial({
    color: cell_color, 
    transparent: true, 
    opacity: cell_op,
    side: THREE.DoubleSide,
    depthWrite: false,
    })

loader.load( './public/models/cells.gltf', function ( cell_mesh ) {
    for ( let i = 0; i < cell_mesh.scene.children.length; i++){
        //set child material
        cell_mesh.scene.children[i].material = cell_mat;    }
    
	scene.add( cell_mesh.scene );
    renderer.render(scene, camera);

}, undefined, function ( error ) {
	console.error( error );
} );


// Load the wire mesh
const wire_mat = new THREE.MeshBasicMaterial({
    color: wire_color,  
    })

loader.load( './public/models/wires.gltf', function ( wire_mesh ) {
    for ( let i = 0; i < wire_mesh.scene.children.length; i++){
        //set child material
        wire_mesh.scene.children[i].material = wire_mat;    }
    
	scene.add( wire_mesh.scene );
    renderer.render(scene, camera);

}, undefined, function ( error ) {
	console.error( error );
} );

// Load the decoration mesh
const deco_mat = new THREE.MeshStandardMaterial({color: deco_color})

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

    const scroll_factor = -11.65;

    //x scroll
    const scrollX = window.scrollX;
    camera.position.x = scrollX / canvasContainer.clientWidth * scroll_factor;

    //y scroll
    const scrollY = window.scrollY;
    camera.position.y = scrollY / canvasContainer.clientWidth * scroll_factor;

    //rerender
    renderer.render(scene, camera);
}




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



function scrollToCenter() {
    // Replace 'targetDiv' with the ID or selector of your target div.
    const targetDiv = document.querySelector('#panel_hello');
  
    if (targetDiv) {
      const windowHeight = window.innerHeight;
      const divHeight = targetDiv.clientHeight;
      const divTop = targetDiv.getBoundingClientRect().top + window.scrollY;
      
      // Calculate the scroll position to center the div.
      const scrollPosition = divTop - (windowHeight / 2) + (divHeight / 2);
  
    //   // Set the scroll position using either 'html' or 'body', as cross-browser compatibility may vary.
    //   document.documentElement.scrollTop = scrollPosition; // For modern browsers.
    //   document.body.scrollTop = scrollPosition; // For older browsers.

      window.scrollTo({ top: scrollPosition, behavior: 'smooth' });

    }
  }
  
  // Call the function when the page loads or as needed.

//other main setup

// Update the renderer size when the window is resized
window.addEventListener('resize', onResize);

// Add a scroll event listener to trigger the onScroll function
window.addEventListener('scroll', onScroll);

scrollToCenter();

onScroll();
onResize();


