import { defs, tiny } from "./examples/common.js";
import { Shape_From_File } from "./examples/obj-file-demo.js";
import {Text_Line} from "./examples/text-demo.js";
import {
  Color_Phong_Shader,
  Shadow_Textured_Phong_Shader,
  Depth_Texture_Shader_2D,
  Buffered_Texture,
  LIGHT_DEPTH_TEX_SIZE,
} from "./examples/shadow-demo-shaders.js";

const { Cube, Textured_Phong, Square } = defs;

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
const z_min = -22;
const z_max = 22;
const min_spawn_interval = 6; // Minimum time between enemy ship spawns, in seconds
const max_spawn_interval = 12; // Maximum time between enemy ship spawns, in seconds

function is_within_bounds(position, x_min, x_max, z_min, z_max) {
  return position[0] >= x_min && position[0] <= x_max && position[2] >= z_min && position[2] <= z_max;
}
function is_out_of_bounds(position, x_min, x_max, z_min, z_max) {
  return position[0] < x_min || position[0] > x_max || position[2] < z_min || position[2] > z_max;
}


function random_edge_position(min, max) {
  const edge = Math.random() > 0.5 ? min : max;
  return edge;
}

function wrap_position(position, min, max) {
  if (position < min) return max;
  if (position > max) return min;
  return position;
}

function check_collisions(a, b) {
  const distance_vector = a.position.minus(b.position);
  const distance_squared = distance_vector.dot(distance_vector);
  const sum = a.size + b.size;
  return distance_squared <= sum * sum;
}
function random_velocity(speed, angle_offset = 0) {
  const angle = Math.random() * 2 * Math.PI + angle_offset;
  const x = speed * Math.cos(angle);
  const z = speed * Math.sin(angle);
  return vec3(x, 0, z);
}

class Asteroid {
  constructor(position, velocity, rotation, size) {
    this.position = position;
    this.velocity = velocity;
    this.rotation = rotation;
    this.size = size;
    this.rotation_speed = Math.random() * (4 - 1) + 1;
    this.transform = Mat4.identity();
  }
}
class Spaceship {
  constructor(position) {
    this.position = position;
    this.velocity = vec3(0, 0, 0);
    this.forward_direction = vec3(0, 0, -1);
    this.rotation = 0;
    this.controls = {
      rotate_left: false,
      rotate_right: false,
      thrust_forward: false,
    };

    this.transform = Mat4.identity();
    this.size = 1.2;
    this.invincible = false;
    this.invincibility_timer = 0;
    this.blink_timer = 0;
  }
}
class Projectile {
  constructor(position, velocity) {
    this.position = position;
    this.velocity = velocity;
    this.lifetime = 1.5;       // in seconds
    this.transform = Mat4.identity();
    this.size = 0.15;
  }
}

class Enemy {
  constructor(position, direction) {
    this.position = position;
    this.velocity = vec3(0, 0, 0);
    this.rotation = 0;
    this.forward_direction = vec3(0, 0, -1);
    this.direction = direction;
    this.lifetime = 10;
    this.size = 1.2;
    this.transform = Mat4.identity();
  }
}

export class Asteroids3D extends Scene {
  constructor() {
    super();
    // Load the model file:
    this.textures = {
      metal: new Texture("assets/metal.jpg"),
      asteroid: new Texture("assets/asteroid.png"),
      background: new Texture("assets/background.jpeg"),
      startscreen: new Texture("assets/Asteroids3DStart.png"),
      endscreen: new Texture("assets/game_over.jpg")
    };

    this.shapes = {
      spaceship: new Shape_From_File("assets/spaceship.obj"),
      enemyship: new Shape_From_File("assets/alienship.obj"),
      asteroid: new Shape_From_File("assets/asteroid.obj"),
      projectile: new defs.Subdivision_Sphere(2),
      square: new defs.Square(),
      asteroid_rock: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
      torus: new defs.Torus(15, 15),
      torus2: new defs.Torus(3, 15),
      universe: new defs.Subdivision_Sphere(4),
      sphere4: new defs.Subdivision_Sphere(4),
      circle: new defs.Regular_2D_Polygon(1, 15),
      sphere1: new defs.Subdivision_Sphere(1),
      sphere2: new defs.Subdivision_Sphere(2),
      sphere3: new defs.Subdivision_Sphere(3),
      ring: new defs.Torus(50, 50),
      planet1: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(2),
      moon: new (defs.Subdivision_Sphere.prototype.make_flat_shaded_version())(1),
    };

    this.shapes.asteroid_rock.arrays.texture_coord = this.shapes.asteroid_rock.arrays.texture_coord.map((x) =>
      x.times(3)
    );

    const shader = new defs.Fake_Bump_Map(1);

    this.materials = {
      ship_metal: new Material(new Textured_Phong(), {
        ambient: 0.2,
        specularity: 0.2,
        color: hex_color("#003876"),
        texture: new Texture("assets/rgb.jpg"),
      }),
      enemy_metal: new Material(new Textured_Phong(), {
        ambient: 0.1,
        diffusivity: 0.3,
        specularity: 0.4,
        color: hex_color("#FF5733"),
        texture: this.textures.metal,
      }),
      asteroid_mat: new Material(new Textured_Phong(), {
        ambient: 0.4,
        diffusivity: 0.2,
        specularity: 0.1,
        color: hex_color("#545454"),
        texture: this.textures.asteroid,
      }),

      start_screen: new Material(new Textured_Phong(), {
        ambient: 1,
        texture: this.textures.startscreen,
      }),

      end_screen: new Material(new Textured_Phong(), {
        ambient: 1,
        texture: this.textures.endscreen,
      }),

      background: new Material(new Textured_Phong(), {
        ambient: 1,
        texture: this.textures.background,
      }),

      sun: new Material(new Textured_Phong(), {
        ambient: 1,
        diffusivity: 1,
        color: hex_color("#ffffff"),
        texture: this.textures.background
      }),

      planet_1: new Material(new defs.Phong_Shader(), {
        ambient: 0,
        diffusivity: 1,
        specularity: 0,
        color: hex_color("#E8E2E2"),
      }),

      planet_2_Gouraud: new Material(new Gouraud_Shader(), {
        ambient: 0,
        diffusivity: 0.1,
        specularity: 1,
        color: hex_color("#80FFFF"),
      }),

      planet_2_Phong: new Material(new defs.Phong_Shader(), {
        ambient: 0,
        diffusivity: 0.1,
        specularity: 1,
        color: hex_color("#80FFFF"),
      }),

      planet_3: new Material(new defs.Phong_Shader(), {
        ambient: 0,
        diffusivity: 1,
        specularity: 1,
        color: hex_color("#B08040"),
      }),
      planet_3_ring: new Material(new Ring_Shader(), {
        ambient: 1,
        diffusivity: 0,
        color: hex_color("#B08040"),
        specularity: 0,
        smoothness: 0,
      }),
      planet_4: new Material(new defs.Phong_Shader(), {
        ambient: 0,
        color: hex_color("#528AAE"),
        specularity: 0.9,
        smoothness: 1,
      }),
      planet_4_moon: new Material(new defs.Phong_Shader(), {
        ambient: 0,
        diffusivity: 1,
        color: hex_color("#ffd966"),
        specularity: 1,
      }),
      proj_mat: new Material(new defs.Phong_Shader(), {
        ambient: 0.5,
        diffusivity: 0.3,
        specularity: 0.4,
        color: hex_color("#ffffff"),
      }),
    };


    this.start_screen = true;
    this.start_game = false;
    this.paused = true;
    this.end_game = false;
    this.lives = 5;
    this.score = 0;
    this.spawn_timer = 0;
    this.spawn_interval = Math.random() * (max_spawn_interval - min_spawn_interval) + min_spawn_interval;
    this.max_asteroids = 6; // set the maximum number of asteroids on screen
    this.max_enemies = 2;
    this.projectiles = [];
    this.enemy_projectiles = [];
    this.asteroids = [];
    this.fragments = [];
    this.enemies = [];
    this.ship = [];

    this.initial_camera_location = Mat4.look_at(
        vec3(0, 10, 20),
        vec3(0, 0, 0),
        vec3(0, 1, 0)
    );


    this.initial_camera_location = Mat4.look_at(vec3(0, 10, 20), vec3(0, 0, 0), vec3(0, 1, 0));

    // this.start_screen_camera_view = Mat4.look_at(
    //   vec3(100, 45, 100),
    //   vec3(0, 0, 0),
    //   vec3(0, 1, 0)
    // )
    this.top_camera_view = Mat4.look_at(
      vec3(0, 45, 5), // eye position (above view)
      vec3(0, 0, 0), // look at the origin (viewport)
      vec3(0, 10, 0) // up direction
    );

    this.start_camera_view = Mat4.look_at(vec3(10000, 30, 80), vec3(80, 30, 80), vec3(0, 1, 0));

    this.end_camera_view = Mat4.look_at(vec3(5000, 30, 80), vec3(80, 30, 80), vec3(0, 1, 0));

    this.start_screen_transform = Mat4.identity()
      .times(Mat4.translation(9980, 30, 80, 0))
      .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
      .times(Mat4.scale(10, 10, 10));

    this.end_screen_transform = Mat4.identity()
      .times(Mat4.translation(4980, 30, 80, 0))
      .times(Mat4.rotation(Math.PI / 2, 0, 1, 0))
      .times(Mat4.scale(10, 10, 10));

    this.background_transform = Mat4.identity().times(Mat4.scale(150, 150, 150));
  }
  draw_spaceship(context, program_state, spaceship, dt) {
    // Update invincibility
    if (spaceship.invincible) {
      spaceship.invincibility_timer += dt; // Increment timer
      spaceship.blink_timer += dt;

      if (spaceship.invincibility_timer >= 1.5) {
        spaceship.invincible = false; // End invincibility
        spaceship.invincibility_timer = 0;
      }
    }
    // Draw the spaceship (with blinking effect)
    if (!spaceship.invincible || (spaceship.invincible && Math.floor(spaceship.blink_timer * 10) % 2 === 0)) {
      this.shapes.spaceship.draw(context, program_state, spaceship.transform, this.materials.ship_metal);
      this.spaceship = Mat4.inverse(spaceship.transform.times(Mat4.translation(0, 1, 5)));
    }
    this.spaceship = Mat4.inverse(spaceship.transform.times(Mat4.translation(0, 1, 5)));
  }

  spawn_asteroid() {
    const min_speed = 3; // adjust these values to your desired speed range
    const max_speed = 5;

    const speed = Math.random() * (max_speed - min_speed) + min_speed;
    const angle = Math.random() * Math.PI * 2;
    const velocity = vec3(Math.sin(angle) * speed, 0, Math.cos(angle) * speed);
    const position = vec3(random_edge_position(x_min, x_max), 0, random_edge_position(z_min, z_max));
    const rotation = Math.random() * 2 * Math.PI;
    const size = Math.random() * 1.7 + 1.2;

    const asteroid = new Asteroid(position, velocity, rotation, size);

    return asteroid;
  }
  spawn_enemy() {
    const edge = Math.floor(Math.random() * 4);
    let random_position;

    switch (edge) {
      case 0: // left edge
        random_position = vec3(x_min, 0, Math.random() * (z_max - z_min) + z_min);
        break;
      case 1: // right edge
        random_position = vec3(x_max, 0, Math.random() * (z_max - z_min) + z_min);
        break;
      case 2: // bottom edge
        random_position = vec3(Math.random() * (x_max - x_min) + x_min, 0, z_min);
        break;
      case 3: // top edge
        random_position = vec3(Math.random() * (x_max - x_min) + x_min, 0, z_max);
        break;
    }
    const enemy = new Enemy(random_position, edge);
    return enemy;
  }
  gen_enemy_projectile(enemy, spaceship, speed) {
    const position = enemy.position;
    const velocity = spaceship.position.minus(enemy.position).normalized().times(speed);
    return new Projectile(position, velocity);
  }
  generate_projectiles(spaceship) {
    // Define the relative position of the guns on the spaceship
    const left_gun_offset = vec3(-0.85, 0, 0);
    const right_gun_offset = vec3(0.85, 0, 0);

    const rotation_matrix = Mat4.rotation(spaceship.rotation, 0, 1, 0);
    const rotated_left_gun_offset = rotation_matrix.times(vec4(...left_gun_offset, 0)).to3();
    const rotated_right_gun_offset = rotation_matrix.times(vec4(...right_gun_offset, 0)).to3();

    const left_gun_position = spaceship.position.plus(rotated_left_gun_offset);
    const right_gun_position = spaceship.position.plus(rotated_right_gun_offset)
    ;
    const projectile_speed = 30;

    const projectile_velocity = spaceship.forward_direction.times(projectile_speed);

    const left_projectile = new Projectile(left_gun_position, projectile_velocity);
    const right_projectile = new Projectile(right_gun_position, projectile_velocity);


    this.projectiles.push(left_projectile);
    this.projectiles.push(right_projectile);
  }

  // Update the spaceship's position and orientation based on user input
  animate_spaceship(spaceship, dt) {
    if (!spaceship) return;

    const rotation_speed = 5;
    const thrust_speed = 12;
    // Rotate left
    if (spaceship.controls.rotate_left) {
      spaceship.rotation += rotation_speed * dt;
    }
    // Rotate right
    if (spaceship.controls.rotate_right) {
      spaceship.rotation -= rotation_speed * dt;
    }
    // Update forward direction based on rotation
    spaceship.forward_direction = vec3(-Math.sin(spaceship.rotation), 0, -Math.cos(spaceship.rotation));

    // Thrust forward
    if (spaceship.controls.thrust_forward) {
      const thrust = spaceship.forward_direction.times(thrust_speed * dt);
      spaceship.position = spaceship.position.plus(thrust);
      spaceship.velocity = spaceship.forward_direction.times(thrust_speed);
    } else {
      spaceship.velocity = vec3(0, 0, 0);
    }

    // Wrap spaceship's position when reaching the screen bounds
    spaceship.position[0] = wrap_position(spaceship.position[0], x_min, x_max);
    spaceship.position[2] = wrap_position(spaceship.position[2], z_min, z_max);

    // Update spaceship's transform
    spaceship.transform = Mat4.translation(...spaceship.position).times(Mat4.rotation(spaceship.rotation, 0, 1, 0));
  }

  // Update the asteroids' position, orientation, and velocity
  animate_asteroids(context, program_state, dt, asteroids, spaceship) {
    for (let i = 0; i < asteroids.length; i++) {
      const asteroid = asteroids[i];
      asteroid.position = asteroid.position.plus(asteroid.velocity.times(dt));
      asteroid.rotation += asteroid.rotation_speed * dt;

      asteroid.position[0] = wrap_position(asteroid.position[0], x_min, x_max);
      asteroid.position[2] = wrap_position(asteroid.position[2], z_min, z_max);
      // Update the asteroid's transform matrix
      const translation = Mat4.translation(...asteroid.position);
      const rotation = Mat4.rotation(asteroid.rotation, 0, 1, 0);
      const scale = Mat4.scale(asteroid.size, asteroid.size, asteroid.size);
      asteroid.transform = translation.times(rotation).times(scale);

      // Check for collision with the spaceship
      if (!spaceship.invincible && check_collisions(spaceship, asteroid)) {
        // Remove the asteroid from the array and decrement the index
        asteroids.splice(i, 1);
        i--;
        spaceship.invincible = true;
        this.lives--;
        this.update_score_lives();
        console.log('Asteroid collided with spaceship, Lives: ', this.lives);
        if (this.lives <= 0) {
          this.game_over();
        }
        continue;
      }
      // Check for collision with other asteroids
      for (let j = i + 1; j < asteroids.length; j++) {
        const other_asteroid = asteroids[j];
        if (check_collisions(asteroid, other_asteroid)) {
          // Swap velocities
          const temp_velocity = asteroid.velocity;
          asteroid.velocity = other_asteroid.velocity;
          other_asteroid.velocity = temp_velocity;

          // Swap rotation speeds
          const temp_rotation_speed = asteroid.rotation_speed;
          asteroid.rotation_speed = other_asteroid.rotation_speed;
          other_asteroid.rotation_speed = temp_rotation_speed;

          // Move the asteroids slightly apart to prevent them from getting stuck
          asteroid.position = asteroid.position.plus(asteroid.velocity.times(dt));
          other_asteroid.position = other_asteroid.position.plus(other_asteroid.velocity.times(dt));
        }
      }


      this.shapes.asteroid.draw(context, program_state, asteroid.transform, this.materials.asteroid_mat);
    }
    // Check if there are less than 4 asteroids and generate new ones
    while (asteroids.length < this.max_asteroids) {
      asteroids.push(this.spawn_asteroid());
    }
  }

  animate_enemies(context, program_state, dt, enemies, spaceship, enemy_projectiles, asteroids) {
    //Increment spawn timer
    this.spawn_timer += dt;

    // Check if it's time to spawn a new enemy ship
    if (this.spawn_timer >= this.spawn_interval) {
      if (enemies.length < this.max_enemies) {
        enemies.push(this.spawn_enemy());
        this.spawn_timer = 0;
        this.spawn_interval = Math.random() * (max_spawn_interval - min_spawn_interval) + min_spawn_interval;
        console.log("Enemies: ", enemies);
      }
    }

    if (enemies) {
      const enemy_speed = 8;
      for (let i = 0; i < enemies.length; i++) {
        const enemy = enemies[i];

        // Calculate the direction to the spaceship
        const direction_to_spaceship = spaceship.position.minus(enemy.position).normalized();

        // Update enemy ship's rotation to face the opposite side of the spaceship
        const opposite_direction = direction_to_spaceship.times(-1);
        const angle_to_spaceship = Math.atan2(opposite_direction[0], opposite_direction[2]);
        enemy.rotation = angle_to_spaceship;

        // Define the enemy ship's movement direction
        // Define the enemy ship's movement direction
        const movement_directions = [
          vec3(1, 0, 0),
          vec3(-1, 0, 0),
          vec3(0, 0, 1),
          vec3(0, 0, -1)
        ];
        const movement_direction = movement_directions[enemy.direction];        // Update enemy ship's position
        const displacement = movement_direction.times(enemy_speed * dt);
        enemy.position = enemy.position.plus(displacement);

        // Update enemy ship's transform and draw it
        enemy.transform = Mat4.translation(...enemy.position).times(Mat4.rotation(enemy.rotation, 0, 1, 0));
        this.shapes.enemyship.draw(context, program_state, enemy.transform, this.materials.enemy_metal);

        // check enemy lifetime
        enemy.lifetime -= dt;
        if (enemy.lifetime <= 0 && is_out_of_bounds(enemy.position, x_min, x_max, z_min, z_max)) {
          enemies.splice(i, 1);
          i--;
        }

        // Enemy shooting logic
        if (is_within_bounds(enemy.position, x_min, x_max, z_min, z_max)) {
          if (Math.random() < 0.008) { // 0.5% chance of shooting per frame
            const projectile_speed = 20;
            const projectile = this.gen_enemy_projectile(enemy, spaceship, projectile_speed);
            enemy_projectiles.push(projectile);
          }
        }

        // Check for collision between enemy ship and spaceship
        if (!spaceship.invincible && check_collisions(enemy, spaceship)) {
          console.log("Spaceship collided with an enemy ship!");
          enemies.splice(i, 1);
          // decrease spaceship lives or end the game
          spaceship.invincible = true;
          this.lives--;
          this.update_score_lives();
          console.log('Enemy ship collided with spaceship, Lives: ', this.lives);
          if (this.lives <= 0) {
            this.game_over();
          }
        }
        // Check for collision between enemy ship and asteroids
        for (let j = 0; j < asteroids.length; j++) {
          const asteroid = asteroids[j];
          if (check_collisions(enemy, asteroid)) {
            console.log("Enemy ship collided with an asteroid!");
            // Destroy the enemy ship and asteroid (or handle collision as desired)
            // Swap velocities
            asteroid.velocity = enemy.velocity;
            // Move the asteroids slightly apart to prevent them from getting stuck
            asteroid.position = asteroid.position.plus(asteroid.velocity.times(dt));
            enemies.splice(i, 1);
            i--;
            // Break from the inner loop to avoid checking the destroyed enemy against other asteroids
            break;
          }
        }

      }

      // Update and draw enemy projectiles
      for (let i = 0; i < enemy_projectiles.length; i++) {
        const projectile = enemy_projectiles[i];
        const displacement = projectile.velocity.times(dt);
        projectile.position = projectile.position.plus(displacement);
        projectile.lifetime -= dt;

        // Check for collision between the projectile and the spaceship
        if (!spaceship.invincible && check_collisions(projectile, spaceship)) {
          console.log("Spaceship hit by enemy projectile!");

          // Remove the projectile from the array
          enemy_projectiles.splice(i, 1);
          spaceship.invincible = true;
          this.lives--;
          this.update_score_lives();

          console.log('Enemy hit spaceship, Lives: ', this.lives);
          if (this.lives <= 0) {
            this.game_over();
          }
          i--;
        } else if (projectile.lifetime <= 0) {
          enemy_projectiles.splice(i, 1);
          i--;
        } else {
          const scale = Mat4.scale(projectile.size, projectile.size, projectile.size);
          projectile.transform = Mat4.translation(...projectile.position).times(scale);
          this.shapes.projectile.draw(context, program_state, projectile.transform, this.materials.proj_mat);
        }
      }
    }
  }

  animate_projectiles(context, program_state, dt, projectiles, asteroids, enemies, fragments) {
    const min_asteroid_size = 1.5;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      // Update the lifetime of the projectile
      projectile.lifetime -= dt;
      // If the projectile's lifetime is up, remove it from the array
      if (projectile.lifetime <= 0) {
        projectiles.splice(i, 1);
        continue;
      }
      const displacement = projectile.velocity.times(dt);
      projectile.position = projectile.position.plus(displacement);

      projectile.position[0] = wrap_position(projectile.position[0], x_min, x_max);
      projectile.position[2] = wrap_position(projectile.position[2], z_min, z_max);

      const translation = Mat4.translation(...projectile.position);
      const scale = Mat4.scale(projectile.size, projectile.size, projectile.size);
      projectile.transform = translation.times(scale);

      // Check for collision with asteroids
      for (let j = asteroids.length - 1; j >= 0; j--) {
        const asteroid = asteroids[j];
        if (check_collisions(projectile, asteroid)) {
          // Remove the projectile and asteroid from their arrays
          console.log("Hit asteroid!");
          this.score += 20;
          this.update_score_lives();
          console.log("Score:" , this.score);
          projectiles.splice(i, 1);
          asteroids.splice(j, 1);
          if (asteroid.size > min_asteroid_size) {
            const num_fragments = 2;
            const fragment_speed = 4;
            const fragment_size = asteroid.size / 2;
            const max_rotation_speed = Math.PI / 1.5;

            for (let k = 0; k < num_fragments; k++) {
              const angle_offset = k * Math.PI + (Math.random() * Math.PI / 2 - Math.PI / 4); // Random angle offset between -45 and 45 degrees for each fragment
              const fragment_velocity = random_velocity(fragment_speed, angle_offset).plus(asteroid.velocity.times(0.5));
              const fragment_rotation_speed = Math.random() * max_rotation_speed;
              const position_offset = vec3(Math.random() * fragment_size - fragment_size / 2, 0, Math.random() * fragment_size - fragment_size / 2);
              const fragment_position = asteroid.position.copy().plus(position_offset);
              const fragment = new Asteroid(fragment_position, fragment_velocity, Math.random() * Math.PI, fragment_size);
              fragment.rotation_speed = fragment_rotation_speed;
              fragments.push(fragment);
            }
            break;
          }
        }
      }
      // Check for collision with fragments
      for (let j = fragments.length - 1; j >= 0; j--) {
        const fragment = fragments[j];
        if (check_collisions(projectile, fragment)) {
          // Remove the projectile and asteroid from their arrays
          this.score += 50;
          this.update_score_lives();
          console.log("Score:" , this.score);
          console.log("Hit fragment!")
          projectiles.splice(i, 1);
          fragments.splice(j, 1);
          break;
        }
      }
      // Check for collision with enemy ships
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (check_collisions(projectile, enemy)) {
          console.log("Hit enemy!")
          this.score += 100;
          this.update_score_lives();
          console.log("Score:" , this.score);
          // Remove the projectile and enemy ship from their arrays
          projectiles.splice(i, 1);
          enemies.splice(j, 1);
          break;
        }
      }
      // If the projectile has been removed due to a collision, skip the rest of the loop
      if (i >= projectiles.length) {
        continue;
      }
      this.shapes.projectile.draw(context, program_state, projectile.transform, this.materials.proj_mat);
    }

  }

  animate_fragments(context, program_state, dt, fragments, spaceship, asteroids) {

    for (let i = 0; i < fragments.length; i++) {
      const fragment = fragments[i];
      fragment.position = fragment.position.plus(fragment.velocity.times(dt));
      fragment.rotation += fragment.rotation_speed * dt;

      fragment.position[0] = wrap_position(fragment.position[0], x_min, x_max);
      fragment.position[2] = wrap_position(fragment.position[2], z_min, z_max);

      // Update the fragment's transform matrix
      const translation = Mat4.translation(...fragment.position);
      const rotation = Mat4.rotation(fragment.rotation, 0, 1, 0);
      const scale = Mat4.scale(fragment.size, fragment.size, fragment.size);
      fragment.transform = translation.times(rotation).times(scale);

      // Check for collision with the spaceship
      if (!spaceship.invincible && check_collisions(spaceship, fragment)) {
        // Remove the asteroid from the array and decrement the index
        fragments.splice(i, 1);
        i--;
        spaceship.invincible = true;
        this.lives--;
        this.update_score_lives();
        console.log('Asteroid collided with spaceship, Lives: ', this.lives);
        if (this.lives <= 0) {
          this.game_over();
        }
        continue;
      }
      // Check for collision with other fragments
      for (let j = i + 1; j < fragments.length; j++) {
        const other_fragment = fragments[j];
        if (check_collisions(fragment, other_fragment)) {
          // Swap velocities
          const temp_velocity = fragment.velocity;
          fragment.velocity = other_fragment.velocity;
          other_fragment.velocity = temp_velocity;
          // Swap rotation speeds
          const temp_rotation_speed = fragment.rotation_speed;
          fragment.rotation_speed = other_fragment.rotation_speed;
          other_fragment.rotation_speed = temp_rotation_speed;
          // Move the asteroids slightly apart to prevent them from getting stuck
          fragment.position = fragment.position.plus(fragment.velocity.times(dt));
          other_fragment.position = other_fragment.position.plus(other_fragment.velocity.times(dt));
        }
      }
      // Check for collision with other asteroids
      for (let j = i + 1; j < asteroids.length; j++) {
        const asteroid = asteroids[j];
        if (check_collisions(fragment, asteroid)) {
          // Swap velocities
          const temp_velocity = fragment.velocity;
          fragment.velocity = asteroid.velocity;
          asteroid.velocity = temp_velocity;

          // Swap rotation speeds
          const temp_rotation_speed = fragment.rotation_speed;
          fragment.rotation_speed = asteroid.rotation_speed;
          asteroid.rotation_speed = temp_rotation_speed;

          // Move the asteroids slightly apart to prevent them from getting stuck
          fragment.position = fragment.position.plus(fragment.velocity.times(dt));
          asteroid.position = asteroid.position.plus(asteroid.velocity.times(dt));
        }
      }
      this.shapes.asteroid.draw(context, program_state, fragment.transform, this.materials.asteroid_mat);
    }
  }

  game_over() {
    console.log("Game Over");
    // You can add any additional actions you want to perform when the game is over, such as displaying a message or stopping the game loop.
    this.end_game = true;

  }

  reset_game() {
    // Reset the spaceship's state
    this.ship = [];
    // Reset the asteroids array
    this.asteroids = [];

    // Reset the fragments array
    this.fragments = [];

    // Reset the projectiles array
    this.projectiles = [];

    // Reset the enemy_projectiles array
    this.enemy_projectiles = [];

    // Reset the enemies array
    this.enemies = [];

    // Reset the player's lives and score
    this.lives = 5;
    this.score = 0;
  }

  update_score_lives() {
    const event = new CustomEvent('score-lives-update', {
      detail: {
        score: this.score,
        lives: this.lives
      }
    });
    document.dispatchEvent(event);
  }

  make_control_panel() {

    this.key_triggered_button("Rotate left", ["a"], () => {
      this.ship[0].controls.rotate_left = true;
    }, undefined, () => {
      this.ship[0].controls.rotate_left = false;
    });

    this.key_triggered_button("Rotate right", ["d"], () => {
      this.ship[0].controls.rotate_right = true;
    }, undefined, () => {
      this.ship[0].controls.rotate_right = false;
    });

    this.key_triggered_button("Thrust Forward", ["w"], () => {
        this.ship[0].controls.thrust_forward = true;
      },
      undefined,
      () => {
        this.ship[0].controls.thrust_forward = false;
      }
    );

    this.key_triggered_button("Shoot", [" "], () => {
      if (this.ship.length > 0) {
        this.generate_projectiles(this.ship[0]);
      }
    });

    this.key_triggered_button("Start", ["y"], () => {
      this.paused = false;
      this.start_game = true;
      this.start_screen = false;
      console.log(this.asteroids)


      if (this.asteroids.length === 0) {
        for (let i = 0; i < this.max_asteroids; i++) {
          this.asteroids.push(this.spawn_asteroid());
        }
        console.log("Asteroids", this.asteroids)
      }
      if (this.ship.length === 0) {
        this.ship.push(new Spaceship(vec3(0, 0, 0)));
      }
    });
    this.key_triggered_button("Restart", ["r"], () => {
      this.paused = true;
      this.start_game = false;
      this.start_screen = true;
      this.end_game = false;
      this.reset_game();
    });

    this.key_triggered_button("Pause", ["p"], () => {
      this.paused = !this.paused;
    });

    this.key_triggered_button("View Environment", ["v"], () => (this.attached = () => this.initial_camera_location));

    this.key_triggered_button("Switch to Spaceship POV", ["g"], () => (this.attached = () => this.spaceship));

    this.key_triggered_button("Switch to Top View POV", ["t"], () => (this.attached = () => this.top_camera_view));
  }

  // note: I choose to follow the example animation given in docs/overview.gif where the sun swells and shrinks in 10s.
  draw_sun(context, program_state) {
    let t = (this.t = program_state.animation_time / 10000 - parseInt(program_state.animation_time / 10000));
    const red = hex_color("#ff0000");
    const white = hex_color("#ffffff");
    const orange = hex_color("#D14009")
    const light_position = vec4(0, -5, 0, 1); // center the point light source to center of the coordinate planes

    // radius swells from 1-3 in 10 sec
    let radius = 1;
    if (t < 0.5) {
      radius += 4 * t;
    } else {
      radius = 3 - 4 * (t - 0.5);
    }
    let model_transform = Mat4.identity().times(Mat4.translation(0, -100, 0)).times(Mat4.scale(6,6,6))

    let color = orange.mix(white, t * 2);
    if (t >= 0.5) {
      color = white.mix(orange, (t - 0.5) * 2);
    }
    // program_state.lights = [new Light(light_position, white, 10 ** radius)]; // Use following for Point Light Source with Changing Size; // The parameters of the Light are: position, color, size
    this.shapes.sphere4.draw(context, program_state, model_transform, this.materials.sun.override({ color: color }));

    return program_state;
  }

  // transform and draw planets in solar system. The 4th planet is rendered with its moon together.
  draw_planets(context, program_state, idx) {
    const radius = 8 + idx * 4;
    const t = (this.t = program_state.animation_time / 100000 - parseInt(program_state.animation_time / 100000));
    const rotation_angle = (t * Math.PI) / 0.5 / (idx + 1) + idx; // rotate 360 degrees in 10 seconds

    let model_transform = Mat4.identity()
      .times(Mat4.rotation(rotation_angle, 0, 1, 0))
      .times(Mat4.translation(radius, -30, 0));

    if (idx == 0) {
      this.shapes.planet1.draw(context, program_state, model_transform, this.materials.planet_1);
      this.planet_1 = Mat4.inverse(model_transform.times(Mat4.translation(0, 0, 5)));
    } else if (idx == 1 && Math.floor((t * 10) % 2) == 1) {
      this.shapes.sphere3.draw(context, program_state, model_transform, this.materials.planet_2_Gouraud);
      this.planet_2 = Mat4.inverse(model_transform.times(Mat4.translation(0, 0, 5)));
    } else if (idx == 1 && Math.floor((t * 10) % 2) == 0) {
      this.shapes.sphere3.draw(context, program_state, model_transform, this.materials.planet_2_Phong);
      this.planet_2 = Mat4.inverse(model_transform.times(Mat4.translation(0, 0, 5)));
    } else if (idx == 2) {
      this.shapes.sphere4.draw(context, program_state, model_transform, this.materials.planet_3);
      this.planet_3 = Mat4.inverse(model_transform.times(Mat4.translation(0, 0, 5)));

      model_transform = model_transform.times(Mat4.scale(3.5, 3.5, 0.01));
      this.shapes.ring.draw(context, program_state, model_transform, this.materials.planet_3_ring);
    } else {
      this.shapes.sphere4.draw(context, program_state, model_transform, this.materials.planet_4);

      this.planet_4 = Mat4.inverse(model_transform.times(Mat4.translation(0, 0, 5)));
      model_transform = model_transform.times(Mat4.rotation(t * 10, 0, 1, 0)).times(Mat4.translation(-2, 0, 0));
      this.shapes.moon.draw(context, program_state, model_transform, this.materials.planet_4_moon);
      this.moon = Mat4.inverse(model_transform.times(Mat4.translation(0, 0, 5)));
    }
  }

  display(context, program_state) {
    if (!context.scratchpad.controls) {
      this.children.push((context.scratchpad.controls = new defs.Movement_Controls()));
      // Define the global camera and projection matrices, which are stored in program_state.

    }
    const t = program_state.animation_time / 1000, dt = program_state.animation_delta_time / 1000; // Convert delta time to seconds

    program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 500);
    program_state.lights = [new Light(vec4(10, 10, 10, 1), color(1, 1, 1, 1), 100000)];

    // draw background
    if (this.start_screen) {
      // draw start screen
      this.shapes.square.draw(context, program_state, this.start_screen_transform, this.materials.start_screen);
      program_state.set_camera(this.start_camera_view);
    }

    if (this.start_game) {
      program_state.set_camera(this.top_camera_view);
      this.start_game = false;
    }

    if(!this.end_game && !this.paused && this.ship.length > 0) {
      // Draw the score and lives display
      this.shapes.universe.draw(context, program_state, this.background_transform, this.materials.background);
      this.draw_sun(context, program_state);
      for (let i = 0; i < 4; i++) {
        this.draw_planets(context, program_state, i);
      }
      this.draw_spaceship(context, program_state, this.ship[0], dt);
      this.animate_spaceship(this.ship[0], dt);
      this.animate_asteroids(context, program_state, dt, this.asteroids, this.ship[0]);
      this.animate_fragments(context, program_state, dt, this.fragments, this.ship[0], this.enemies);
      this.animate_projectiles(context, program_state, dt, this.projectiles, this.asteroids, this.enemies, this.fragments);
      this.animate_enemies(context, program_state, dt, this.enemies, this.ship[0], this.enemy_projectiles, this.asteroids);
    }

    if(this.end_game) {
      // draw end screen
      this.shapes.square.draw(context, program_state, this.end_screen_transform, this.materials.end_screen);
      program_state.set_camera(this.end_camera_view);
      this.paused = true;
      // game over screen
    }

    if (this.paused) {
      // pause screen
    }

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

// CUSTOM SHADERS

// CUSTOM SHADERS

class Jellyfish_Shader extends Shader {
  // This is a Shader using Phong_Shader as template
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
      varying vec4 point_position;
      varying vec4 center;

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
              
              center = model_transform * vec4(0.0, 0.0, 2.5, 1.0);
              point_position = model_transform * vec4(position, 1.0);

              vertex_color = vec4(shape_color.xyz * ambient, shape_color.w);
              vertex_color.xyz += phong_model_lights(N, vertex_worldspace);
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
               float scalar = 0.40 + 0.3 * sin(distance(point_position.xyz, center.xyz));
               gl_FragColor = scalar * vertex_color;
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
    const defaults = { color: color(0, 0, 0, 1), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40 };
    material = Object.assign({}, defaults, material);

    this.send_material(context, gpu_addresses, material);
    this.send_gpu_state(context, gpu_addresses, gpu_state, model_transform);
  }
}

class Ring_Shader extends Shader {
  update_GPU(context, gpu_addresses, graphics_state, model_transform, material) {
    // update_GPU():  Defining how to synchronize our JavaScript's variables to the GPU's:
    const [P, C, M] = [graphics_state.projection_transform, graphics_state.camera_inverse, model_transform],
      PCM = P.times(C).times(M);
    context.uniformMatrix4fv(
      gpu_addresses.model_transform,
      false,
      Matrix.flatten_2D_to_1D(model_transform.transposed())
    );
    context.uniformMatrix4fv(
      gpu_addresses.projection_camera_model_transform,
      false,
      Matrix.flatten_2D_to_1D(PCM.transposed())
    );
  }

  shared_glsl_code() {
    // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    return `
        precision mediump float;
        varying vec4 point_position;
        varying vec4 center;
        `;
  }

  vertex_glsl_code() {
    // ********* VERTEX SHADER *********
    return (
      this.shared_glsl_code() +
      `
        attribute vec3 position;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;
        
        void main(){
          center = model_transform * vec4(0, 0, 0, 1);
          point_position = model_transform * vec4(position, 1);
          gl_Position = projection_camera_model_transform * vec4(position, 1);
        }`
    );
  }

  fragment_glsl_code() {
    // ********* FRAGMENT SHADER *********
    return (
      this.shared_glsl_code() +
      `
        void main(){
          float multiplier = sin(18.01 * distance(point_position.xyz, center.xyz));
          gl_FragColor = multiplier * vec4(0.6078, 0.3961, 0.098, 1.0);
        }`
    );
  }
}
