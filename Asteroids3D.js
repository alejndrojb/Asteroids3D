import { defs, tiny } from "./examples/common.js";
import { Shape_From_File } from "./examples/obj-file-demo.js";
import { Game, DIRS } from "./game.js";

const {
  Vector,
  Vector3,
  vec,
  vec3,
  vec4,
  color,
  hex_color,
  Shader,
  Matrix,
  Mat4,
  Light,
  Shape,
  Material,
  Texture,
  Scene,
} = tiny;

function Asteroid(x, y, velocity) {
  this.x = x;
  this.y = y;
  this.velocity = velocity;
}

function Spaceship(x, y) {
  this.x = x;
  this.y = y;
}

function Laser(x, y, velocity) {
  this.x = x;
  this.y = y;
  this.velocity = velocity;
}

export class Asteroids3D extends Scene {
  constructor() {
    super();
    // Load the model file:

    this.textures = {
      metal: new Texture("assets/metal.jpg"),
      asteroid: new Texture("assets/asteroid.png"),
      background: new Texture("assets/background.png"),
    };

    this.shapes = {
      spaceship: new Shape_From_File("assets/spaceship.obj"),
      alienship: new Shape_From_File("assets/alienship.obj"),
      asteroid: new defs.Subdivision_Sphere(2),
      asteroid2: new defs.Subdivision_Sphere(2),
      asteroid3: new defs.Subdivision_Sphere(2),
      asteroid4: new defs.Subdivision_Sphere(2),
      asteroid5: new defs.Subdivision_Sphere(2),
      asteroid6: new defs.Subdivision_Sphere(2),
      asteroid7: new defs.Subdivision_Sphere(2),
      asteroid8: new defs.Subdivision_Sphere(2),
      square: new defs.Square(),
    };

    const shader = new defs.Fake_Bump_Map(1);

    this.materials = {
      ship_metal: new Material(new Gouraud_Shader(), {
        ambient: 0.4,
        diffusivity: 0.3,
        specularity: 0.7,
        color: hex_color("#4682B4"),
        texture: this.textures.metal,
      }),

      asteroid_mat: new Material(shader, {
        ambient: 0.4,
        diffusivity: 0.5,
        specularity: 0.2,
        color: hex_color("#808080"),
        texture: this.textures.asteroid,
      }),
    };

    // initialize game logic
    this.game = new Game();

    this.control = {};
    this.start = true;
    this.paused = true;
    this.begin = false;
    this.end = false;
    this.time = 0;
    this.control.w = false;
    this.control.a = false;
    this.control.s = false;
    this.control.d = false;
    this.control.space = false;
    this.lives = 5;
    this.lasers = [];
    this.max_asteroids = 10; // set the maximum number of asteroids on screen

    this.initial_camera_location = Mat4.look_at(vec3(25, 15, 50), vec3(25, 15, 0), vec3(0, 1, 0));

    this.top_camera_view = Mat4.look_at(
      vec3(0, 40, 10), // eye position (above view)
      vec3(0, 25, 0), // look at the origin (the spaceship)
      vec3(0, 10, 0) // up direction
    );
  }

  draw_asteroids(context, program_state, transform) {}

  make_control_panel() {
    this.key_triggered_button("Up", ["w"], () => this.game.changeDirection(DIRS.UP));
    this.key_triggered_button("Left", ["a"], () => this.game.changeDirection(DIRS.LEFT));
    this.key_triggered_button("Down", ["s"], () => this.game.changeDirection(DIRS.DOWN));
    this.key_triggered_button("Right", ["d"], () => this.game.changeDirection(DIRS.RIGHT));
    this.key_triggered_button("Shoot", [" "], () => this.game.shoot());
    this.key_triggered_button("Start", ["y"], () => {
      this.paused = false;
      this.begin = true;
    });

    this.key_triggered_button("View Environment", ["v"], () => (this.attached = () => this.initial_camera_location));
    this.key_triggered_button("Switch to spaceship POV", ["g"], () => (this.attached = () => this.spaceship));
  }

  display(context, program_state) {
    if (!context.scratchpad.controls) {
      // Define the global camera and projection matrices, which are stored in program_state.
      program_state.set_camera(this.initial_camera_location);
    }

    const t = program_state.animation_time / 1000,
      dt = program_state.animation_delta_time / 1000; // Convert delta time to seconds

    program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);

    program_state.lights = [new Light(vec4(10, 10, 10, 1), color(1, 1, 1, 1), 100000)];

    let ship_transform = Mat4.identity();
    ship_transform = ship_transform.times(Mat4.translation(0, 0, 0));
    this.shapes.spaceship.draw(context, program_state, ship_transform, this.materials.ship_metal);
    this.spaceship = Mat4.inverse(ship_transform.times(Mat4.translation(0, 1, 5)));

    this.game.getAsteroids().forEach((asteroid) => {
      let asteroid_transform = Mat4.identity()
        .times(Mat4.translation(asteroid.x * 2, asteroid.y * 2, asteroid.z * 2))
        .times(Mat4.rotation(0.625 * t, 0, 1, 1));
      this.shapes.asteroid.draw(context, program_state, asteroid_transform, this.materials.asteroid_mat);
    });

    // render enemies
    this.game.getEnemies().forEach((enemy, idx) => {
      let enemy_transform = Mat4.identity().times(
        Mat4.translation(enemy.position.x * 2, enemy.position.y * 2, enemy.position.z * 2)
      );
      this.shapes.alienship.draw(
        context,
        program_state,
        enemy_transform,
        this.materials.ship_metal.override({ color: hex_color("#992828") })
      );
    });
    // let asteroid_transform = Mat4.identity(); // xmin: -20, xmax: 20, ymin: 0 ,ymax: 21, z = 0
    // asteroid_transform = asteroid_transform
    //   .times(Mat4.translation(0, 0, -19))
    //   .times(Mat4.rotation(0.625 * t, 1, 1, 1));
    // this.shapes.asteroid.draw(
    //   context,
    //   program_state,
    //   asteroid_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid = asteroid_transform;

    // let asteroid2_transform = Mat4.identity();
    // asteroid2_transform = asteroid2_transform
    //   .times(Mat4.translation(7, 0, -16))
    //   .times(Mat4.rotation(0.625 * t, 0, 1, 1));
    // this.shapes.asteroid2.draw(
    //   context,
    //   program_state,
    //   asteroid2_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid2 = asteroid2_transform;

    // let asteroid3_transform = Mat4.identity();
    // asteroid3_transform = asteroid3_transform
    //   .times(Mat4.translation(-10, 0, -20))
    //   .times(Mat4.rotation(0.625 * t, 1, 1, 0));
    // this.shapes.asteroid3.draw(
    //   context,
    //   program_state,
    //   asteroid3_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid3 = asteroid3_transform;

    // let asteroid4_transform = Mat4.identity();
    // asteroid4_transform = asteroid4_transform
    //   .times(Mat4.translation(-13, 0, -13))
    //   .times(Mat4.rotation(0.625 * t, 0, 1, 1));
    // this.shapes.asteroid4.draw(
    //   context,
    //   program_state,
    //   asteroid4_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid4 = asteroid4_transform;

    // let asteroid5_transform = Mat4.identity();
    // asteroid5_transform = asteroid5_transform
    //   .times(Mat4.translation(13, 0, -9))
    //   .times(Mat4.rotation(0.625 * t, 0, 1, 1));
    // this.shapes.asteroid5.draw(
    //   context,
    //   program_state,
    //   asteroid5_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid5 = asteroid5_transform;

    // let asteroid6_transform = Mat4.identity();
    // asteroid6_transform = asteroid6_transform
    //   .times(Mat4.translation(-3, 0, -9))
    //   .times(Mat4.rotation(0.625 * t, 0, 1, 1));
    // this.shapes.asteroid6.draw(
    //   context,
    //   program_state,
    //   asteroid6_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid6 = asteroid6_transform;

    // let asteroid7_transform = Mat4.identity();
    // asteroid7_transform = asteroid7_transform
    //   .times(Mat4.translation(-19, 0, -5))
    //   .times(Mat4.rotation(0.625 * t, 0, 1, 1));
    // this.shapes.asteroid7.draw(
    //   context,
    //   program_state,
    //   asteroid7_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid7 = asteroid7_transform;

    // let asteroid8_transform = Mat4.identity();
    // asteroid8_transform = asteroid8_transform
    //   .times(Mat4.translation(6, 0, -5))
    //   .times(Mat4.rotation(0.625 * t, 0, 1, 1));
    // this.shapes.asteroid8.draw(
    //   context,
    //   program_state,
    //   asteroid8_transform,
    //   this.materials.asteroid_mat
    // );
    // this.asteroid8 = asteroid8_transform;

    let aleinship_transform = Mat4.identity();
    aleinship_transform = aleinship_transform.times(Mat4.translation(-2, 0, -15)).times(Mat4.rotation(60, 0, 1, 0));
    this.shapes.alienship.draw(
      context,
      program_state,
      aleinship_transform,
      this.materials.ship_metal.override(hex_color("#992828"))
    );
    this.alienship = aleinship_transform;

    if (this.attached != undefined) {
      program_state.camera_inverse = this.attached().map((x, i) =>
        Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)
      );
    }
  }
}

class Gouraud_Shader extends Shader {
  // This is a Shader using Phong_Shader as template
  // TODO: Modify the glsl coder here to create a Gouraud Shader (Planet 2)

  constructor(num_lights = 2) {
    super();
    this.num_lights = num_lights;
  }

  shared_glsl_code() {
    // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    return (
      ` 
        precision mediump float;
        const int N_LIGHTS = ` +
      this.num_lights +
      `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

        // Specifier "varying" means a variable's final value will be passed from the vertex shader
        // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
        // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        varying vec3 N, vertex_worldspace;
        varying vec4 vertex_color;
        // ***** PHONG SHADING HAPPENS HERE: *****                                       
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace ){                                        
            // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++){
                // Lights store homogeneous coords - either a position or vector.  If w is 0, the 
                // light will appear directional (uniform direction from all points), and we 
                // simply obtain a vector towards the light by directly using the stored value.
                // Otherwise if w is 1 it will appear as a point light -- compute the vector to 
                // the point light's location from the current surface point.  In either case, 
                // fade (attenuate) the light as the vector needed to reach it gets longer.  
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz - 
                                               light_positions_or_vectors[i].w * vertex_worldspace;                                             
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                // Compute the diffuse and specular components from the Phong
                // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );
                
                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;
                result += attenuation * light_contribution;
            }
            return result;
        } `
    );
  }

  vertex_glsl_code() {
    // ********* VERTEX SHADER *********
    return (
      this.shared_glsl_code() +
      `
            attribute vec3 position, normal;                          
            // Position is expressed in object coordinates.
            
            uniform mat4 model_transform;
            uniform mat4 projection_camera_model_transform;
    
            void main(){                                                                   
                // The vertex's final resting place (in NDCS):
                gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                // The final normal vector in screen space.
                N = normalize( mat3( model_transform ) * normal / squared_scale);
                vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;

                vertex_color = vec4(shape_color.xyz * ambient, shape_color.w);
                vertex_color.xyz = vertex_color.xyz + phong_model_lights(N, vertex_worldspace);
            } `
    );
  }

  fragment_glsl_code() {
    // ********* FRAGMENT SHADER *********
    // A fragment is a pixel that's overlapped by the current triangle.
    // Fragments affect the final image or get discarded due to depth.
    return (
      this.shared_glsl_code() +
      `
            void main(){                                                           
                // Compute fragment color
                gl_FragColor = vertex_color; 
            } `
    );
  }

  send_material(gl, gpu, material) {
    // send_material(): Send the desired shape-wide material qualities to the
    // graphics card, where they will tweak the Phong lighting formula.
    gl.uniform4fv(gpu.shape_color, material.color);
    gl.uniform1f(gpu.ambient, material.ambient);
    gl.uniform1f(gpu.diffusivity, material.diffusivity);
    gl.uniform1f(gpu.specularity, material.specularity);
    gl.uniform1f(gpu.smoothness, material.smoothness);
  }

  send_gpu_state(gl, gpu, gpu_state, model_transform) {
    // send_gpu_state():  Send the state of our whole drawing context to the GPU.
    const O = vec4(0, 0, 0, 1),
      camera_center = gpu_state.camera_transform.times(O).to3();
    gl.uniform3fv(gpu.camera_center, camera_center);
    // Use the squared scale trick from "Eric's blog" instead of inverse transpose matrix:
    const squared_scale = model_transform
      .reduce((acc, r) => {
        return acc.plus(vec4(...r).times_pairwise(r));
      }, vec4(0, 0, 0, 0))
      .to3();
    gl.uniform3fv(gpu.squared_scale, squared_scale);
    // Send the current matrices to the shader.  Go ahead and pre-compute
    // the products we'll need of the of the three special matrices and just
    // cache and send those.  They will be the same throughout this draw
    // call, and thus across each instance of the vertex shader.
    // Transpose them since the GPU expects matrices as column-major arrays.
    const PCM = gpu_state.projection_transform.times(gpu_state.camera_inverse).times(model_transform);
    gl.uniformMatrix4fv(gpu.model_transform, false, Matrix.flatten_2D_to_1D(model_transform.transposed()));
    gl.uniformMatrix4fv(gpu.projection_camera_model_transform, false, Matrix.flatten_2D_to_1D(PCM.transposed()));

    // Omitting lights will show only the material color, scaled by the ambient term:
    if (!gpu_state.lights.length) return;

    const light_positions_flattened = [],
      light_colors_flattened = [];
    for (let i = 0; i < 4 * gpu_state.lights.length; i++) {
      light_positions_flattened.push(gpu_state.lights[Math.floor(i / 4)].position[i % 4]);
      light_colors_flattened.push(gpu_state.lights[Math.floor(i / 4)].color[i % 4]);
    }
    gl.uniform4fv(gpu.light_positions_or_vectors, light_positions_flattened);
    gl.uniform4fv(gpu.light_colors, light_colors_flattened);
    gl.uniform1fv(
      gpu.light_attenuation_factors,
      gpu_state.lights.map((l) => l.attenuation)
    );
  }

  update_GPU(context, gpu_addresses, gpu_state, model_transform, material) {
    // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
    // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
    // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
    // program (which we call the "Program_State").  Send both a material and a program state to the shaders
    // within this function, one data field at a time, to fully initialize the shader for a draw.

    // Fill in any missing fields in the Material object with custom defaults for this shader:
    const defaults = {
      color: color(0, 0, 0, 1),
      ambient: 0,
      diffusivity: 1,
      specularity: 1,
      smoothness: 40,
    };
    material = Object.assign({}, defaults, material);

    this.send_material(context, gpu_addresses, material);
    this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
  }
}
