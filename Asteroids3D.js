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

const x_min = -36;   // outer edges of viewport
const x_max = 36;
const z_min = -21;
const z_max = 21;
const x_width = 72;    // width of viewport
const z_height = 42;    // height of viewport
class Asteroid {
  constructor(position, side, direction) {
    this.position = position;
    this.transform = Mat4.identity();
    this.side = side;
    this.direction = direction;
    this.velocity = vec3(0,0,0);
  }
}
class Spaceship {
  constructor(position) {
    this.position = position
    this.velocity = vec3(0,0,0);
    this.acceleration = 0.3;
    this.rotation_speed = Math.PI / 20;
    this.rotate_left = false;
    this.rotate_right = false;
    this.forward_direction = vec3(0,0,-1);
    this.shooting = false;
    this.transform = Mat4.identity();

  }
}

function Laser(position) {
  this.position = position;
  this.velocity = vec3(0,0,0);
}

function collides(obj1, obj2) {

}

export class Asteroids3D extends Scene {
  constructor() {
    super();
    // Load the model file:

    this.textures = {
      metal: new Texture("assets/metal.jpg"),
      asteroid: new Texture("assets/asteroid.png"),
      background: new Texture("assets/background.png"),
      startscreen: new Texture("assets/Asteroids3DStart.png"),
    };

    this.shapes = {
      spaceship: new Shape_From_File("assets/spaceship.obj"),
      alienship: new Shape_From_File("assets/alienship.obj"),
      asteroid: new Shape_From_File("assets/asteroid.obj"),
      // asteroid: new defs.Subdivision_Sphere(2),
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
      start_screen: new Material(new Gouraud_Shader(), {
        ambient: 0.5,
        diffusivity: 0.5,
        specularity: 0.5,
        texture: this.textures.startscreen,
      }),
    };

    // initialize game logic
    this.game = new Game();

    this.start_screen = true;
    this.start_game = false;
    this.paused = true;
    this.game_over = false;
    this.lives = 5;
    this.lasers = [];
    this.max_asteroids = 15; // set the maximum number of asteroids on screen
    this.asteroids = [];
    this.ship = [];


    this.initial_camera_location = Mat4.look_at(
        vec3(0, 10, 20),
        vec3(0, 0, 0),
        vec3(0, 1, 0)
    );

    this.top_camera_view = Mat4.look_at(
        vec3(0, 45, 5),  // eye position (above view)
        vec3(0, 0, 0),     // look at the origin (viewport)
        vec3(0, 10, 0)      // up direction
    );
  }
  draw_spaceship(context, program_state, ship) {
    this.shapes.spaceship.draw(context, program_state, ship.transform, this.materials.ship_metal);
  }
  make_asteroids() {
    const min_dist = 10;  // minimum distance between asteroids
    for (let i = 0; i < this.max_asteroids; i++) {
      let x, z;
      let asteroid;
      let valid = false;
      let side;
      let direction;

      while (!valid) {
        if (Math.random() < 0.5) {
          // Spawn on left or right edge
          x = (Math.random() < 0.5) ? x_min : x_max;
          z = z_min + Math.random() * z_height;
        } else {
          // Spawn on top or bottom edge
          x = x_min + Math.random() * x_width;
          z = (Math.random() < 0.5) ? z_min : z_max;
        }
        // Check if asteroid is at least `min_dist` units away from other asteroids
        valid = true;
        for (let j = 0; j < this.asteroids.length; j++) {
          const dist = Math.sqrt((this.asteroids[j].position[0] - x) ** 2 + (this.asteroids[j].position[2] - z) ** 2);
          if (dist < min_dist) {
            valid = false;
            break;
          }
        }
      }
      // gets what side of screen asteroid is on
      if (x === x_min) {
        side = 'left';
      } else if (x === x_max) {
        side = 'right';
      } else if (z === z_min) {
        side = 'bottom';
      } else {
        side = 'top';
      }
      // sets direction asteroid should go based on side
      switch (side) {
      case 'left':
        direction = ['right', 'rightup', 'rightdown'][Math.floor(Math.random() * 3)];
        break;
      case 'right':
        direction = ['left', 'leftup', 'leftdown'][Math.floor(Math.random() * 3)];
        break;
      case 'bottom':
        direction = ['up', 'leftup', 'rightup'][Math.floor(Math.random() * 3)];
        break;
      case 'top':
        direction = ['down', 'leftdown', 'rightdown'][Math.floor(Math.random() * 3)];
        break;
      }

      asteroid = new Asteroid(vec3(x, 0, z), side, direction);
      this.asteroids.push(asteroid);
    }
  }
  animate_asteroids(context, program_state, t, asteroids) {
    const rotate_ang = 0.625;

    const speed = 1;
    const x_left = -(speed) * (t % x_width) + x_max;
    const x_right = (speed) * (t % x_width) + x_min;
    const z_up = -(speed) * (t % z_height) + z_max;
    const z_down = (speed) * (t % z_height) + z_min;

    for (let i = 0; i < asteroids.length; i++) {
      let translation;
      let rotate;

      switch (asteroids[i].direction) {
        case 'left':
          translation = Mat4.translation(x_left , 0, asteroids[i].position[2]);
          rotate = Mat4.rotation(rotate_ang * t, -1 , -1, -1); // rotate right
          break;
        case 'right':
          translation = Mat4.translation(x_right, 0, asteroids[i].position[2]);
          rotate = Mat4.rotation(rotate_ang * t, 1 , 1, 1);   // rotate left
          break;
        case 'up':
          translation = Mat4.translation(asteroids[i].position[0], 0, z_up);
          rotate = Mat4.rotation(rotate_ang * t, -1 , 0, 0);  // rotate up
          break;
        case 'down':
          translation = Mat4.translation(asteroids[i].position[0], 0, z_down);
          rotate = Mat4.rotation(rotate_ang * t, 1 , 0, 0)    // rotate down
          break;
        case 'leftup':
          translation = Mat4.translation(x_left , 0, z_up );
          rotate = Mat4.rotation(rotate_ang * t, -1 , 0, 1);  // rotate leftup
          break;
        case 'leftdown':
          translation = Mat4.translation(x_left, 0, z_down);
          rotate= Mat4.rotation(rotate_ang * t, 1 , 0, 1);    // rotate leftdown
          break;
        case 'rightup':
          translation = Mat4.translation(x_right, 0, z_up);
          rotate = Mat4.rotation(rotate_ang * t, -1 , 0, -1); // rotate rightup
          break;
        case 'rightdown':
          translation = Mat4.translation(x_right, 0, z_down);
          rotate = Mat4.rotation(rotate_ang * t, 1 , 0, -1);   // rotate rightdown
          break;
      }

      // Apply translation and rotation
      const transform = asteroids[i].transform.times(translation).times(rotate);

      // Draw the asteroid
      this.shapes.asteroid.draw(context, program_state, transform, this.materials.asteroid_mat);
    }

  }


  make_control_panel() {
    // this.key_triggered_button("Up", ["w"], () => this.game.changeDirection(DIRS.UP));
    // this.key_triggered_button("Left", ["a"], () => this.game.changeDirection(DIRS.LEFT));
    // this.key_triggered_button("Down", ["s"], () => this.game.changeDirection(DIRS.DOWN));
    // this.key_triggered_button("Right", ["d"], () => this.game.changeDirection(DIRS.RIGHT));
    // this.key_triggered_button("Shoot", [" "], () => this.game.shoot());
    this.key_triggered_button("Rotate left", ["a"], () => {
      const rotation_matrix = Mat4.rotation(this.ship[0].rotation_speed, 0, 1, 0);
      this.ship[0].transform = this.ship[0].transform.times(rotation_matrix);
      this.ship[0].forward_direction = rotation_matrix.times(vec4(...this.ship[0].forward_direction, 0)).to3();
    });

    this.key_triggered_button("Rotate right", ["d"], () => {
      const rotation_matrix = Mat4.rotation(-this.ship[0].rotation_speed, 0, 1, 0);
      this.ship[0].transform = this.ship[0].transform.times(rotation_matrix);
      this.ship[0].forward_direction = rotation_matrix.times(vec4(...this.ship[0].forward_direction, 0)).to3();
    });

    this.key_triggered_button("Thrust Forward", ["w"], () => {
      const thrust_vector = this.ship[0].forward_direction.times(this.ship[0].acceleration);
      this.ship[0].transform = this.ship[0].transform.times(Mat4.translation(...thrust_vector));

    });

    this.key_triggered_button("Start", ["y"], () => {
      this.paused = false;
      this.start_game = true;
      this.start_screen = false;
      if (this.asteroids.length === 0) {
        this.make_asteroids()
      }
      if (this.ship.length === 0) {
        this.ship.push(new Spaceship(vec3(0,0,0)));
      }

    });

    this.key_triggered_button("View Environment", ["v"], () => (this.attached = () => this.initial_camera_location));

    this.key_triggered_button("Switch to Spaceship POV", ["g"], () => (this.attached = () => this.spaceship));

    this.key_triggered_button("Switch to Top View POV", ["t"], () => (this.attached = () => this.top_camera_view));
  }

  display(context, program_state) {
    if (!context.scratchpad.controls) {
      this.children.push(context.scratchpad.controls = new defs.Movement_Controls());
      // Define the global camera and projection matrices, which are stored in program_state.
      program_state.set_camera(this.top_camera_view);
    }

    const t = program_state.animation_time / 100, dt = program_state.animation_delta_time / 1000; // Convert delta time to seconds

    program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);



    program_state.lights = [new Light(vec4(10, 10, 10, 1), color(1, 1, 1, 1), 100000)];

    // const ship = new Spaceship(0,0,0);
    // this.shapes.spaceship.draw(context, program_state, ship.transform, this.materials.ship_metal);
    // this.spaceship = Mat4.inverse(ship.transform.times(Mat4.translation(0, 1, 5)));

    // const x_left = -(2) * (t % this.x_width) + this.x_max;
    // let asteroid_transform = Mat4.identity();
    // asteroid_transform = asteroid_transform.times(Mat4.translation(x_left,0,10))
    //     .times(Mat4.rotation(.625 * t, -1 ,0,1 ));
    // this.shapes.asteroid.draw(context, program_state, asteroid_transform, this.materials.asteroid_mat);
    // this.asteroid = asteroid_transform;


    if(this.start_game) {
      this.start_game = false;
    }

    if (this.asteroids.length > 0 && this.asteroids.length <= this.max_asteroids) {
      this.animate_asteroids(context, program_state, t, this.asteroids);
    }

    if (this.ship.length === 1) {
      this.draw_spaceship(context, program_state, this.ship[0]);

    }



    // if (this.paused) {
    //
    // }
    //




    // this.game.getAsteroids().forEach((asteroid) => {
    //   let asteroid_transform = Mat4.identity()
    //       .times(Mat4.translation(asteroid.x * 2 , 10, 0))
    //       .times(Mat4.rotation(0.625 * t, 0, 1, 1));
    //   this.shapes.asteroid.draw(context, program_state, asteroid_transform, this.materials.asteroid_mat);
    //   this.asteroids.push(asteroid);
    // });



    // render enemies
    // this.game.getEnemies().forEach((enemy, idx) => {
    //   let enemy_transform = Mat4.identity().times(
    //       Mat4.translation(enemy.position.x * 2, enemy.position.y * 2, enemy.position.z * 2)
    //   );
    //   this.shapes.alienship.draw(
    //       context,
    //       program_state,
    //       enemy_transform,
    //       this.materials.ship_metal.override({ color: hex_color("#992828") })
    //   );
    // });


    // let alienship_transform = Mat4.identity();
    // alienship_transform = alienship_transform.times(Mat4.translation(-2, 0, -15)).times(Mat4.rotation(60, 0, 1, 0));
    // this.shapes.alienship.draw(
    //     context,
    //     program_state,
    //     alienship_transform,
    //     this.materials.ship_metal.override(hex_color("#992828"))
    // );
    // this.alienship = alienship_transform;

    if (this.attached != undefined) {
      program_state.camera_inverse = this.attached().map((x, i) =>
          Vector.from(program_state.camera_inverse[i]).mix(x, 0.1)
      );
    }
  }

  // Update the spaceship's position and orientation based on user input
  // Update the asteroids' position, orientation, and velocity
  animate_roids(context, program_state, t, asteroids) {

  }
  animate_lasers(context, program_state, t, lasers) {

  }

  check_collisions(spaceship, asteroids, lasers) {

  }



  game_over() {

  }

  reset_game() {

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
