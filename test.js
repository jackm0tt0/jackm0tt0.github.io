import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Rhino3dmLoader } from 'three/addons/loaders/3DMLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { CCDIKSolver } from 'three/addons/animation/CCDIKSolver.js';
import Stats from 'three/addons/libs/stats.module.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SobelOperatorShader } from 'three/addons/shaders/SobelOperatorShader.js';
import { MaskPass, ClearMaskPass } from 'three/addons/postprocessing/MaskPass.js';
import { ClearPass } from 'three/addons/postprocessing/ClearPass.js';
import * as CustomShaders from './shaders.js'
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';
import { ConvolutionShader } from 'three/addons/shaders/ConvolutionShader.js';


let camera, look, renderer;
let composer;
let controls;

let debugScene, baseScene;

let override_mat;

let baseTexture;

let prevTime = performance.now();

const default_robot_pos = new THREE.Vector3(100,10,350);
const default_camera_position = new THREE.Vector3(4000,-4000,3400);
const default_look = new THREE.Vector3(0,0,0);

const mouse_3d = default_robot_pos.clone();
const target = new THREE.Object3D();
target.position.set(mouse_3d);

const scene_width = 1100;

const canvasContainer = document.querySelector('.canvas-container');
const canvas_width = canvasContainer.clientWidth;
const canvas_height = canvasContainer.clientHeight;

let line_mat, rob_mat;

const stats = new Stats();
const statsContainer = document.getElementById( 'stats' );
stats.domElement.style.top = '0px';
statsContainer.appendChild( stats.domElement );

const RenderSpacer = document.getElementById( 'spacer' );


init();
animate();

function init() {

    // Z-up
    THREE.Object3D.DEFAULT_UP.set( 0, 0, 1 );

    // init camera
    camera = new THREE.OrthographicCamera(-300,300,300,-300,0.01,10000);

    camera.position.copy(default_camera_position);
    look = new THREE.Vector3().copy(default_look);
    camera.lookAt(look);
    
    // init scene
    debugScene = new THREE.Scene();
    baseScene = new THREE.Scene();
    
    // Main Lights
    const directionalLight = new THREE.DirectionalLight( 0xffffff, 5 );
    directionalLight.position.set( 1, -3, 1 );
    baseScene.add( directionalLight );

    const domeLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.5);
    baseScene.add(domeLight);


    
    let box_mat = new THREE.MeshStandardMaterial();
    box_mat.flatShading = true;
    override_mat = new THREE.MeshDepthMaterial();


    //create a geometry
    let box = new THREE.BoxGeometry(100,100,100);
    let box_mesh = new THREE.Mesh(box, box_mat);   
    baseScene.add(box_mesh);

    let box2 = new THREE.BoxGeometry(100,100,100);
    box2.translate(0,300,0);
    let box_mesh2 = new THREE.Mesh(box2, box_mat);   
    baseScene.add(box_mesh2);

    let torus = new THREE.TorusKnotGeometry(40,10,300,20);
    torus.translate(0,0,200);
    let torus_mesh = new THREE.Mesh(torus, box_mat);
    baseScene.add(torus_mesh);


    // Testing Robot Geometry    
    
    // Load from Rhino
    const rh_loader = new Rhino3dmLoader();
    
    rh_loader.setLibraryPath( 'https://unpkg.com/rhino3dm@8.0.0/' );
    rh_loader.load( './public/models/robot.3dm', function ( rh_object ) {

        //When load is complete execute this:
        rh_object.name = "rhino_scene";

        rh_object.traverse( n => {

            // ignore the file itself
            if (n.userData.objectType !== "File3dm"){

                // look for user tag in the 3dm file
                let web_key = '';
                if (n.userData.attributes.userStrings?.length > 0){
                    web_key = n.userData.attributes.userStrings[0][1];
                }

                console.log(n.name)
                
                // Robot Stuff              
                if(web_key === 'robot' && n.userData.objectType === "Mesh"){

                    n.material = box_mat;
                    baseScene.add(n);                    
                }            
            
            }
        });
 

    }, function ( progress ) {

        console.log ( ( progress.loaded / progress.total * 100 ) + '%' );

    }, function ( error ) {

        console.log ( error );

    } );

    
    // RENDERING

    // RENDER TARGETS

    // RENDERER
    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize(canvas_width, canvas_height);
    canvasContainer.appendChild(renderer.domElement);
    renderer.setClearColor(0xffffff)

    // Controls in case you need to pan around the scene
    controls = new OrbitControls( camera, renderer.domElement );

    // COMPOSER
    composer = new EffectComposer( renderer ); 
    composer.renderToScreen = true;

    // RENDER PASSES

    baseTexture = new THREE.FramebufferTexture(canvas_width * window.devicePixelRatio, canvas_height * window.devicePixelRatio);

    // Mask Render Pass
    const maskRenderPass = new RenderPass( baseScene, camera );

    composer.addPass(maskRenderPass);


    // Sobel Pass
    const effectSobel = new ShaderPass( SobelOperatorShader );

    effectSobel.uniforms[ 'resolution' ].value.x = canvas_width/1 * window.devicePixelRatio;
    effectSobel.uniforms[ 'resolution' ].value.y = canvas_height/1 * window.devicePixelRatio;
    
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
    // ]
    composer.addPass(convolutionPass);





    // FXAA Shader
    const fxaaPass = new ShaderPass(FXAAShader);
    fxaaPass.material.uniforms[ 'resolution' ].value.x = 1 / ( canvas_width * window.devicePixelRatio );
	fxaaPass.material.uniforms[ 'resolution' ].value.y = 1 / ( canvas_height * window.devicePixelRatio );
    composer.addPass(fxaaPass);

    // custom shader pass
    const maskPass = new ShaderPass( CustomShaders.MaskShader );
    maskPass.uniforms.threshold.value = 0.5;
    maskPass.uniforms.color.value = [0,0,0];
    maskPass.uniforms.tBase.value = baseTexture;

    composer.addPass(maskPass);

    


    // event subscriptions
    //window.addEventListener('resize', resize)
}

function render(){

    const vec = new THREE.Vector2();

    baseScene.overrideMaterial = null;
    renderer.renderToScreen = false;
    renderer.render(baseScene, camera);
    renderer.copyFramebufferToTexture(vec , baseTexture);

    baseScene.overrideMaterial = override_mat;
    composer.render();

    // debugRenderTarget(composer.renderTarget2, baseTexture);
    // renderer.render(debugScene, camera);


}

function debugRenderTarget(renderTarget, tex) {
    let texture;
    if (tex == null ){
        texture = renderTarget.texture;
    }else{
        texture = tex;
    }
    
    var width = renderTarget.width/1000;
    var height = renderTarget.height/1000;

    var geometry = new THREE.PlaneGeometry(width, height);
    var material = new THREE.MeshBasicMaterial({ map: texture });
    var mesh = new THREE.Mesh(geometry, material);

    debugScene.add(mesh);
}

function resize() {

    const width = canvas_width;
    const height = canvas_height;
    camera.aspect = width / height;

    let sf = scene_width / height
    
    if (width < height){
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
    renderer.setSize( canvas_width, canvas_height );
    composer.setSize( canvas_width, canvas_height);
    composer.render();

}

function animate() {

    setTimeout( function() {

        // get time
        const time = performance.now();
        stats.update();

        // update camera
        camera.lookAt(look);

        //render the scene
        render();

        // call next frame
        requestAnimationFrame( animate );

        // set previous time
        prevTime = time;

    }, 1000 / 300 );
}