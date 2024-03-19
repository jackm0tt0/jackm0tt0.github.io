import {
	Vector2
} from 'three';

const MaskShader = {

	name: 'MaskShader',

	uniforms: {

        'tDiffuse': { value: null },
		'tBase' : {value: null},
		'threshold': { value: 0 },
		'color' : {value: null}

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

        uniform sampler2D tDiffuse;
		uniform sampler2D tBase;
        uniform float threshold;
		uniform vec3 color;

		varying vec2 vUv;

		void main() {

            //get tex coordinates
			vec4 mask_texel = texture2D( tDiffuse, vUv );
			vec4 base_texel = texture2D( tBase, vUv );
			
			if (mask_texel.r > threshold){
				gl_FragColor.rgb = color;
				gl_FragColor.a = 1.0;
			}
			else{
				gl_FragColor = base_texel;
			}         
		}`

};

const MyOutlineShader = {

	name: 'MyOutlineShader',

	uniforms: {

        'tDiffuse': { value: null },
		'tBase': { value: null},
		'resolution': { value: new Vector2() },
		'threshold': {value: 0.5}

	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`

		// Modified from SobelOperatorShader 
		//(https://github.com/mrdoob/three.js/blob/master/examples/jsm/shaders/SobelOperatorShader.js)

        uniform sampler2D tDiffuse;
		uniform sampler2D tBase;
		uniform vec2 resolution;
		uniform float threshold;

		varying vec2 vUv;

		void main() {

			vec2 texel = vec2( 1.0 / resolution.x, 1.0 / resolution.y );

			// kernel definition (in glsl matrices are filled in column-major order)

			// const mat3 Gx = mat3( -2.25, -1, -2.25, 0, 0, 0, 2.25, 1, 2.25 ); // x direction kernel
			// const mat3 Gy = mat3( -2.25, 0, 2.25, -1, 0, 1, -2.25, 0, 2.25 ); // y direction kernel

			// my kernel is oriented diagonally to reduce artifacts
			const mat3 Gx = mat3( -2, -1, 0, -1, 0, 1, 0, 1, 2 ); // x direction kernel
			const mat3 Gy = mat3( 0, 1, 2, -1, 0 , 1, -2, -1, 0 ); // y direction kernel

			// fetch the 3x3 neighbourhood of a fragment

			// first column

			float tx0y0 = texture2D( tDiffuse, vUv + texel * vec2( -1, -1 ) ).r;
			float tx0y1 = texture2D( tDiffuse, vUv + texel * vec2( -1,  0 ) ).r;
			float tx0y2 = texture2D( tDiffuse, vUv + texel * vec2( -1,  1 ) ).r;

			// second column

			float tx1y0 = texture2D( tDiffuse, vUv + texel * vec2(  0, -1 ) ).r;
			float tx1y1 = texture2D( tDiffuse, vUv + texel * vec2(  0,  0 ) ).r;
			float tx1y2 = texture2D( tDiffuse, vUv + texel * vec2(  0,  1 ) ).r;

			// third column

			float tx2y0 = texture2D( tDiffuse, vUv + texel * vec2(  1, -1 ) ).r;
			float tx2y1 = texture2D( tDiffuse, vUv + texel * vec2(  1,  0 ) ).r;
			float tx2y2 = texture2D( tDiffuse, vUv + texel * vec2(  1,  1 ) ).r;

			// gradient value in x direction

			float valueGx = Gx[0][0] * tx0y0 + Gx[1][0] * tx1y0 + Gx[2][0] * tx2y0 +
				Gx[0][1] * tx0y1 + Gx[1][1] * tx1y1 + Gx[2][1] * tx2y1 +
				Gx[0][2] * tx0y2 + Gx[1][2] * tx1y2 + Gx[2][2] * tx2y2;

			// gradient value in y direction

			float valueGy = Gy[0][0] * tx0y0 + Gy[1][0] * tx1y0 + Gy[2][0] * tx2y0 +
				Gy[0][1] * tx0y1 + Gy[1][1] * tx1y1 + Gy[2][1] * tx2y1 +
				Gy[0][2] * tx0y2 + Gy[1][2] * tx1y2 + Gy[2][2] * tx2y2;

			// magnitute of the total gradient

			float G = sqrt( ( valueGx * valueGx ) + ( valueGy * valueGy ) );

			gl_FragColor = vec4(texture2D( tBase, vUv ).rgb - vec3( step( threshold ,G)), 1 );

		}`

};

export{MaskShader, MyOutlineShader};