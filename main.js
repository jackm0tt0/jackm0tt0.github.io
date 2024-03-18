import * as THREE from 'three';

//ThreeJS utilites
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import Stats from 'three/addons/libs/stats.module.js';

//ThreeJS scene addons
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';

//ThreeJS shaders and other rendering addons
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SobelOperatorShader } from 'three/addons/shaders/SobelOperatorShader.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { ConvolutionShader } from 'three/addons/shaders/ConvolutionShader.js';

//Custom Shaders
import * as CustomShaders from './shaders.js'

//ThreeJS addons for the robot
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';

// Find Document Elements

// Light-Dark Mode Toggle
const toggleSwitch = document.getElementsByClassName( 'checkbox-theme')[0];

// ThreeJS Stats
const stats = new Stats();
const statsContainer = document.getElementById( 'stats' );
stats.domElement.style.top = '0px';
statsContainer.appendChild( stats.domElement );

// ThreeJS Canvas Container
const canvasContainer = document.querySelector('.canvas-container');

// Hole in the Web Container onto which the scene is centered
const RenderSpacer = document.getElementById( 'spacer' );

// Loader
const loader = document.getElementById( 'loader' )

// Initialize Global Stuff
let camera, look, scene; // Scene
let line_mat, override_mat; // Materials
let composer, renderer, baseTexture; // Rendering
let gui; // Utility
let ikSolver, robot_zone, robot_parts; //Robot
let prevTime = performance.now(); //Time
let canvas_width, canvas_height; //Document

// Default Settings
// Z-up
THREE.Object3D.DEFAULT_UP.set( 0, 0, 1 );
const default_robot_pos = new THREE.Vector3(100,10,350);
const default_camera_position = new THREE.Vector3(4000,-4000,3400);
const default_look = new THREE.Vector3(0,0,0);
const scene_width = 1100;

// Dynamic Scene Objects
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const mouse_3d = default_robot_pos.clone();
const target = new THREE.Object3D();
target.position.copy(mouse_3d);

// MAIN
initDocument();
initScene();
initRenderer();
animate();

// Initializations

function initScene() {

    // init camera
    camera = new THREE.OrthographicCamera(-1,1,1,-1,0.001,15000);

    camera.position.copy(default_camera_position);
    look = new THREE.Vector3().copy(default_look);
    camera.lookAt(look);
    
    // init scene
    scene = new THREE.Scene();
    
    // Main Lights
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
    directionalLight.position.set( 1, -3, 10 );
    scene.add( directionalLight );

    const domeLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(domeLight);

    // Create a material for lines
    line_mat = new LineMaterial( {

        color: 0x00ffff,
        linewidth: 5, // in pixels
        dashed: false,
        alphaToCoverage: true,
        vertexColors: true,
    
    } );

    // assign a material to the robot
    override_mat = new THREE.MeshDepthMaterial();
    override_mat.flatShading = true;
    
    // Load from Rhino
    const rh_loader = new Rhino3dmLoader();
    
    rh_loader.setLibraryPath( 'https://unpkg.com/rhino3dm@8.0.0/' );
    rh_loader.load( './public/models/robot.3dm', function ( rh_object ) {

        //Load rhino Stuff
        loadRhinoAssets(rh_object);

        // Do this after rhino is loaded
        // setup robot
        initRobot( robot_parts );
        //initGUI( rh_object.userData.layers );

        // hide loading sequence
        loader.style.display = 'none';
        
        resize();
        initEventListeners();

    }, function ( progress ) {

        console.log ( ( progress.loaded / progress.total * 100 ) + '%' );

    }, function ( error ) {

        console.log ( error );

    } );

    return scene;
}

function initDocument(){

    canvas_width = window.innerWidth -28;
    canvas_height = window.innerHeight;
    

    detectColorScheme();
    toggleSwitch.addEventListener('change', switchTheme, false);
    if (document.documentElement.getAttribute("data-theme") == "dark"){
        toggleSwitch.checked = true;
    }

    //determines if the user has a set theme
    function detectColorScheme(){
        var theme="light";    //default to light

        //local storage is used to override OS theme settings
        if(localStorage.getItem("theme")){
            if(localStorage.getItem("theme") == "dark"){
                var theme = "dark";
            }
        } else if(!window.matchMedia) {
            //matchMedia method not supported
            return false;
        } else if(window.matchMedia("(prefers-color-scheme: dark)").matches) {
            //OS theme setting detected as dark
            var theme = "dark";
        }

        //dark theme preferred, set document with a `data-theme` attribute
        if (theme=="dark") {
            document.documentElement.setAttribute("data-theme", "dark");
        }
    }

    //function that changes the theme, and sets a localStorage variable to track the theme between page loads
    function switchTheme(e) {
        if (e.target.checked) {
            localStorage.setItem('theme', 'dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            toggleSwitch.checked = true;
        } else {
            localStorage.setItem('theme', 'light');
            document.documentElement.setAttribute('data-theme', 'light');
            toggleSwitch.checked = false;
        }    
    }
    

}

function initEventListeners(){
    window.addEventListener( 'resize', resize );
    window.addEventListener( 'scroll' , scroll);
    window.addEventListener( "mousemove" , mouseMove);
}

function initGUI( layers ) {

    gui = new GUI( { title: 'layers' } );
    for ( let i = 0; i < layers.length; i ++ ) {
        const layer = layers[ i ];
        gui.add( layer, 'visible' ).name( layer.name ).onChange( function ( val ) {
            const name = this.object.name;
            scene.traverse( function ( child ) {
                if ( child.userData.hasOwnProperty( 'attributes' ) ) {
                    if ( 'layerIndex' in child.userData.attributes ) {
                        const layerName = layers[ child.userData.attributes.layerIndex ].name;
                        if ( layerName === name ) {
                            child.visible = val;
                            layer.visible = val;
                        }
                    }
                }
            } );
        } );
    }

}

function initRobot( robot_parts ){

    // Set position for  target object for IK solver
    target.position.set(0,0,0);
    target.name = "target"
    scene.add(target);

    // Load the rob mesh
    let skmesh = new THREE.SkinnedMesh();;
    let bones = [];
    let skeleton = new THREE.Skeleton(); 

    // build bones from the skeleton

    let bone_count = robot_parts.skeleton_polyline.geometry.attributes.position.count

    // extract points from skeleton
    var pts = [];
    for (let i=0 ; i < bone_count; i++){
        pts.push(new THREE.Vector3(
            robot_parts.skeleton_polyline.geometry.attributes.position.array[i * 3],
            robot_parts.skeleton_polyline.geometry.attributes.position.array[i * 3 + 1],
            robot_parts.skeleton_polyline.geometry.attributes.position.array[i * 3 + 2]
        ))
    }

    // "root"
    let rootBone = new THREE.Bone();
    rootBone.position.copy(pts[0]);
    bones.push( rootBone );

    // "bone0"
    let prevBone = new THREE.Bone();
    rootBone.add( prevBone );
    bones.push( prevBone );
    robot_parts.joints["j0"].position.sub(pts[0]);

    // bone 1 --> bone n
    for ( let i = 1; i <= bone_count-2; i ++ ) {
        // create new bone with location relative to origin
        const bone = new THREE.Bone();
        bone.position.copy(pts[i].clone().sub(pts[i-1]));

        // setup bone heirarchy chain
        bone.parent = prevBone;
        bones.push( bone );
        prevBone.add( bone );
        prevBone = bone;

        // move meshes to origin
        robot_parts.joints["j"+String(i)].position.sub(pts[i])

        // attach meshes\
        bones[i].add(robot_parts.joints["j"+String(i-1)]);
    }

    bones[bone_count-1].add(robot_parts.joints["j"+String(bone_count-2)]);

    // "target"
    const targetBone = new THREE.Bone();
    targetBone.position.sub(pts[0]);
    rootBone.add( targetBone );
    bones.push( targetBone );


    //
    // skinned mesh
    //
    
    skmesh = new THREE.SkinnedMesh();
    skmesh.material = override_mat;
    skeleton = new THREE.Skeleton( bones );

    skmesh.add( bones[ 0 ] ); // "root" bone
    skmesh.bind( skeleton );
    target.attach(targetBone) // link to mouse attracted target object
    skmesh.boundingSphere = new THREE.Sphere(skmesh.position, 1);
    // skmesh.geometry.computeBoundingSphere();
    //scene.add(skmesh);
    scene.add(skmesh);

    //
    // ikSolver
    //

    const iks = [
        {
            target: 7, // "target"
            effector: 6, // "bone3"
            links: [ 
                { 
                    index: 5,
                    rotationMin: new THREE.Vector3( 0, -Math.PI/2, 0 ),
                    rotationMax: new THREE.Vector3( 0, Math.PI/2, 0 )
                }, 
                { 
                    index: 4,
                    rotationMin: new THREE.Vector3( 0,0,-Math.PI*2),
                    rotationMax: new THREE.Vector3( 0,0,Math.PI*2)
                }, 
                { 
                    index: 3,
                    rotationMin: new THREE.Vector3( 0, -Math.PI/2, 0 ),
                    rotationMax: new THREE.Vector3( 0, Math.PI/2, 0 )
                }, 
                { 
                    index: 2,
                    rotationMin: new THREE.Vector3( 0, -Math.PI/2, 0 ),
                    rotationMax: new THREE.Vector3( 0, Math.PI/2, 0 )
                }, 
                { 
                    index: 1,
                    rotationMin: new THREE.Vector3( 0,0,-Math.PI*2),
                    rotationMax: new THREE.Vector3( 0,0,Math.PI*2)
                } 
            ], // "bone2", "bone1", "bone0"
            iteration: 3,
            minAngle: 0,
            maxAngle: Math.PI/180
        }
    ];

    ikSolver = new CCDIKSolver( skmesh, iks );

    const helper = ikSolver.createHelper();
    //scene.add(helper);

    robot_zone = robot_parts.zone;
}

function initRenderer(){

    // init renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(canvas_width, canvas_height);
    renderer.renderToScreen = false;
    canvasContainer.appendChild(renderer.domElement);


    // COMPOSER
    composer = new EffectComposer( renderer );
    composer.renderToScreen = true;
    

    // Texture where we save the background image for the scene
    baseTexture = new THREE.FramebufferTexture(canvas_width*window.devicePixelRatio, canvas_height*window.devicePixelRatio);
    
    // Mask Render Pass (use override depth material)
    
    const renderPass = new RenderPass( scene, camera );
    composer.addPass(renderPass);


    // Sobel Pass
    const effectSobel = new ShaderPass( SobelOperatorShader );

    effectSobel.uniforms[ 'resolution' ].value.x = canvas_width/1.5 * window.devicePixelRatio;
    effectSobel.uniforms[ 'resolution' ].value.y = canvas_height/1.5 * window.devicePixelRatio;
    
    composer.addPass(effectSobel);


    // Convolution Shader
    const convolutionPass = new ShaderPass(ConvolutionShader);
    convolutionPass.uniforms.uImageIncrement.value = new THREE.Vector2 (.0001,0);
    convolutionPass.uniforms.cKernel.value = [
        0.75,    0.25,    0.00,    0.25,    0.75,
        0.25,    0.75,    0.75,    0.75,    0.25,
        0.00,    0.75,    1.00,    0.75,    0.00,
        0.25,    0.75,    0.75,    0.75,    0.25,
        0.75,    0.25,    0.00,    0.25,    0.75
        
    ]
    // convolutionPass.uniforms.cKernel.value = [
    //     1,.2,1,
    //     .2,1,.2,
    //     1,.2,1
    // ] //Alternate smaller conv filter
    composer.addPass(convolutionPass);

    // FXAA Shader
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( canvas_width * window.devicePixelRatio);
	fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( canvas_height * window.devicePixelRatio);
    composer.addPass(fxaaPass);

    // custom shader pass
    const maskPass = new ShaderPass( CustomShaders.MaskShader );
    maskPass.uniforms.threshold.value = 0.5;
    maskPass.uniforms.color.value = [0.1,0.1,0.1];
    maskPass.uniforms.tBase.value = baseTexture;

    composer.addPass(maskPass);

    // const myOutlinePass = new ShaderPass( CustomShaders.MyOutlineShader );
    // myOutlinePass.uniforms.cameraNear.value = camera.near;
    // myOutlinePass.uniforms.cameraFar.value = camera.far;

    //composer.addPass(myOutlinePass);
    

}

function loadRhinoAssets(rh_object){
    //When load is complete execute this:
    rh_object.name = "rhino_scene";
    scene.add( rh_object );

    robot_parts = {};
    robot_parts.joints = {};
    rh_object.traverse( n => {

        // ignore the file itself
        if (n.userData.objectType !== "File3dm"){

            // look for user tag in the 3dm file
            let web_key = '';
            if (n.userData.attributes.userStrings?.length > 0){
                web_key = n.userData.attributes.userStrings[0][1];
            }
            

            // Robot Stuff              
            if(web_key === 'robot'){

                if (n.name === "rob_zone") {
                    robot_parts.zone = n;
                    n.visible = false;
                }else{
                    n.material.flatShading = true;
                    // n.material = new THREE.MeshBasicMaterial();
                }
                
                
                if (n.name === "rob_base") robot_parts.base = n;
                else if (n.name === "rob_0") robot_parts.joints.j0 = n;
                else if (n.name === "rob_1") robot_parts.joints.j1 = n;
                else if (n.name === "rob_2") robot_parts.joints.j2 = n;
                else if (n.name === "rob_3") robot_parts.joints.j3 = n;
                else if (n.name === "rob_4") robot_parts.joints.j4 = n;
                else if (n.name === "rob_5") robot_parts.joints.j5 = n;
                else if (n.name === "rob_skeleton") {
                    robot_parts.skeleton_polyline = n;
                    n.visible = false;
                }
                
            }            

            // how to handle lines

            if (n.type === "Line" && n.visible){

                let geom = new LineGeometry();
                geom.setPositions( n.geometry.attributes.position.array );
                
                let newline = new Line2(geom, line_mat);
                newline.position.set(0,0,0);
                newline.computeLineDistances();
                scene.add(newline);
                n.visible = false;// hide old lines
            }
        
        }
    });
}

// Event Handling

function mouseMove( event ) {

    if ( event.isPrimary === false ) return;

    mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

    checkIntersection();

}

function checkIntersection() {

    raycaster.setFromCamera( mouse.clone(), camera );

    let robot_hit = raycaster.intersectObjects([robot_zone]);

    if (robot_hit.length > 0 ) {
        mouse_3d.copy(robot_hit[1].point.clone());
    }else{
        mouse_3d.copy(default_robot_pos);
    }


}

function scroll() {

    const scroll_factor = 1275;

    var rect = RenderSpacer.getBoundingClientRect();
    var centerY = rect.top + rect.height / 2;
    var delta_y

    if (window.innerWidth < window.innerHeight){
        delta_y = -(window.innerHeight/2 - centerY) / (window.innerWidth-18);
    }
    else {
        delta_y = -(window.innerHeight/2 - centerY) / window.innerHeight;
    }

    look.z = default_look.z + delta_y * scroll_factor;
    camera.position.z = default_camera_position.z + delta_y * scroll_factor;

    checkIntersection();
}

function resize() {

    canvas_width = window.innerWidth -28;
    canvas_height = window.innerHeight;

    camera.aspect = canvas_width / canvas_height;

    let sf = scene_width / canvas_height
    
    if (canvas_width < canvas_height){
        camera.left = -canvas_height/2*sf;
        camera.right = canvas_height/2*sf;
        camera.top = canvas_height**2 / canvas_width / 2*sf; 
        camera.bottom = -(canvas_height**2) / canvas_width / 2*sf;
    }else{
        camera.left = -canvas_width/2*sf;
        camera.right = canvas_width/2*sf;
        camera.top = canvas_height/ 2*sf; 
        camera.bottom = -canvas_height/ 2*sf;
    }
    
    scroll();

    // set line resolution.
    line_mat.resolution.set( canvas_width, canvas_height );

    camera.updateProjectionMatrix();
    renderer.setSize( canvas_width, canvas_height );
    composer.setSize( canvas_width, canvas_height );

    // custom shader pass
    baseTexture = new THREE.FramebufferTexture(canvas_width*window.devicePixelRatio, canvas_height*window.devicePixelRatio);

    const newMaskPass = new ShaderPass( CustomShaders.MaskShader );
    newMaskPass.uniforms.threshold.value = 0.5;
    newMaskPass.uniforms.color.value = [0.1,0.1,0.1];
    newMaskPass.uniforms.tBase.value = baseTexture;
    
    composer.passes[composer.passes.length-1] = newMaskPass;

    render();


}

// Rendering and Animation

function render(){

    const vec  = new THREE.Vector2();
    //baseTexture = new THREE.FramebufferTexture(10,10);

    scene.overrideMaterial = null;
    renderer.render(scene, camera);
    
    renderer.copyFramebufferToTexture(vec, baseTexture);

    scene.overrideMaterial = override_mat;
    composer.render();
}

function animate() {

    setTimeout( function() {

        // get time
        const time = performance.now();
        stats.update();

        // update camera
        camera.lookAt(look);

        // update robot
        ikSolver?.update();
        if (target.position.distanceTo(mouse_3d)>10){
            var dt = (time - prevTime);
            var dx = target.position.distanceTo(mouse_3d);
            var step = Math.min(dt/3, dx/2);
            target.position.add(mouse_3d.clone().sub( target.position ).setLength(step));
        }

        render();
        requestAnimationFrame( animate );

        // set previous time
        prevTime = time;

    }, 1000 / 100 );

    

}

