import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';

let camera, scene, renderer;
let composer, outlinePass;
let controls, gui;

let ikSolver, robot_zone;


let selectedObjects = [];

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const mouse_3d = new THREE.Vector3(200,0,300);
const target = new THREE.Object3D();
target.position.set(mouse_3d);

const scene_width = 1000;

init();
animate();

function init() {

    // Z-up
    THREE.Object3D.DEFAULT_UP.set( 0, 0, 1 );

    // init renderer
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    const canvasContainer = document.querySelector('.canvas-container');
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.sortObjects = false;
    canvasContainer.appendChild(renderer.domElement);

    // init camera
    camera = new THREE.OrthographicCamera(-1,1,1,-1,0.01,10000);
    resize();

    camera.position.set( 1400, -1400, 1200 );
    let look = new THREE.Vector3(0,0,500)
    camera.lookAt(look);
    
    // init scene
    scene = new THREE.Scene();
    
    // Main Lights
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 2 );
    directionalLight.position.set( 1, -3, 10 );
    scene.add( directionalLight );

    const domeLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    scene.add(domeLight);
    
    // Load from Rhino
    const rh_loader = new Rhino3dmLoader();
    
    rh_loader.setLibraryPath( 'https://unpkg.com/rhino3dm@8.0.0/' );
    rh_loader.load( './public/models/robot.3dm', function ( rh_object ) {

        //When load is complete execute this:
        rh_object.name = "rhino_scene";
        scene.add( rh_object );

        let robot_parts = {};
        robot_parts.joints = {};
        rh_object.traverse( n => {

            if (n.name === "rob_base") robot_parts.base = n;
            if (n.name === "rob_0") robot_parts.joints.j0 = n;
            if (n.name === "rob_1") robot_parts.joints.j1 = n;
            if (n.name === "rob_2") robot_parts.joints.j2 = n;
            if (n.name === "rob_3") robot_parts.joints.j3 = n;
            if (n.name === "rob_4") robot_parts.joints.j4 = n;
            if (n.name === "rob_5") robot_parts.joints.j5 = n;
            if (n.name === "rob_skeleton") robot_parts.skeleton_polyline = n;
            if (n.name === "rob_zone") robot_parts.zone = n;
        });

        // setup robot
        initRobot( robot_parts );
        
        // helper for turning on and off layers
        initGUI( rh_object.userData.layers );

        // hide loading sequence
        document.getElementById( 'loader' ).style.display = 'none';

    }, function ( progress ) {

        console.log ( ( progress.loaded / progress.total * 100 ) + '%' );

    }, function ( error ) {

        console.log ( error );

    } );

    // Controls in case you need to pan around the scene
    controls = new OrbitControls( camera, renderer.domElement );

    // init composer
    composer = new EffectComposer( renderer );

    // add base render pass
    const renderPass = new RenderPass( scene, camera );
    composer.addPass( renderPass );

    // outlines for interactive objects
    outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
    //composer.addPass( outlinePass );

    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.addEventListener( 'pointermove', onPointerMove );

    function onPointerMove( event ) {

        if ( event.isPrimary === false ) return;

        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;

        checkIntersection();

    }

    function addSelectedObject( object ) {

        selectedObjects = [];
        selectedObjects.push( object );

    }

    function checkIntersection() {

        raycaster.setFromCamera( mouse.clone(), camera );

        const intersects = raycaster.intersectObject( scene, true );

        let robot_hit = raycaster.intersectObjects([robot_zone]);

        if (robot_hit.length > 0 ) {
            console.log("here")
            mouse_3d.copy(robot_hit[1].point.clone());
        }else{
            mouse_3d.set(200,0,300);
        }

        if ( intersects.length > 0 ) {

            const selectedObject = intersects[ 0 ].object;
            addSelectedObject( selectedObject );
            outlinePass.selectedObjects = selectedObjects;

        } else {

            
            outlinePass.selectedObjects = [];

        }

    }

    // Event Subscriptions
    window.addEventListener( 'resize', resize );

}

function resize() {

    

    const width = window.innerWidth;
    const height = window.innerHeight;
    camera.aspect = width / height;

    let sf = scene_width / height
    
    if (window.innerWidth < height){
        camera.left = -height/2*sf;
        camera.right = height/2*sf;
        camera.top = height**2 / width / 2*sf; 
        camera.bottom = -(height**2) / width / 2*sf;
    }else{
        camera.left = -width/2*sf;
        camera.right = width/2*sf;
        camera.top = height/ 2*sf; 
        camera.bottom = -height/ 2*sf;
    }

    camera.updateProjectionMatrix();
    renderer.setSize( width, height );

}

function animate() {

    controls.update();
    //renderer.render( scene, camera );
    ikSolver?.update();
    target.position.add(mouse_3d.clone().sub( target.position ).setLength(.3));
    //console.log(target.position);
    composer.render( scene, camera );
    requestAnimationFrame( animate );

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

    // Set target object for IK solver
    target.position.set(0,0,0);
    scene.add(target);

    // Load the rob mesh
    let skmesh = new THREE.SkinnedMesh();;
    let bones = [];
    let skeleton = new THREE.Skeleton(); 

    // build bones from the skeleton

    const pts = [];
    for (let i=0 ; i < robot_parts.skeleton_polyline.geometry.attributes.position.count; i++){
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
    prevBone.position.copy(pts[0]);
    rootBone.add( prevBone );
    bones.push( prevBone );

    // "bone1", "bone2", "bone3"
    for ( let i = 1; i <= 5; i ++ ) {
        const bone = new THREE.Bone();
        bone.position.copy(pts[i].clone().sub(pts[i-1]));
        bone.parent = prevBone;
        bones.push( bone );
        
        prevBone.add( bone );
        prevBone = bone;

        robot_parts.joints["j"+String(i)].position.sub(pts[i])
        //robot_parts.children[i+1].position.sub(pts[i]);

        // attach meshes\
        bones[i].add(robot_parts.joints["j"+String(i-1)]);
    }

    // "target"
    const targetBone = new THREE.Bone();
    rootBone.add( targetBone );
    bones.push( targetBone );


    //
    // skinned mesh
    //
    skmesh = new THREE.SkinnedMesh();
    skeleton = new THREE.Skeleton( bones );

    skmesh.add( bones[ 0 ] ); // "root" bone
    skmesh.bind( skeleton );
    target.attach(targetBone)
    skmesh.boundingSphere = new THREE.Sphere(skmesh.position, 1);
    scene.add(skmesh)

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

    // const plane_geo = new THREE.PlaneGeometry(1000,1000);
    // robot_plane = new THREE.Mesh( plane_geo, new THREE.MeshBasicMaterial());
    // robot_plane.position.set(0,0,100);
    // //scene.add(robot_plane);
}