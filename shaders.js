/**
 * Full-screen textured quad shader
 */

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
		'tDepth' : { value: null },
		'cameraNear': { value: 1 },
		'cameraFar': { value: 1000 }


	},

	vertexShader: /* glsl */`

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`,

	fragmentShader: /* glsl */`


        uniform sampler2D tDiffuse;
		uniform sampler2D tDepth;

		uniform float cameraNear;
		uniform float cameraFar;

		varying vec2 vUv;

		void main() {

			float depth = texture2D( tDepth, vUv ).x;
			
			gl_FragColor = vec4( 0.0, 1.0, 0.0 , 1.0);     
		}`

};

export { 
	MyOutlineShader,
	MaskShader 
};