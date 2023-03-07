import {defs, tiny} from './examples/common.js';
import { Shape_From_File} from "./examples/obj-file-demo.js";

const {vec3, vec4, vec, color, Mat4, Light, hex_color, Shape, Material, Shader, Texture, Scene} = tiny;
function Asteroid(x,y,velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
}

function Spaceship (x,y) {
    this.x = x;
    this.y = y;
}

function Laser (x,y, velocity)  {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
}

function spawn_asteroids (asteroids) {

}

export class Asteroids3D extends Scene {
    constructor() {
        super();
        // Load the model file:

        this.textures = {
            metal: new Texture("assets/metal.jpg"),
            asteroid: new Texture("assets/asteroid.png")
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
        };

        const shader = new defs.Fake_Bump_Map(1);

        this.materials = {
            ship_metal: new Material(shader,
                {ambient: 0.4, diffusivity: 0.3, specularity: 0.7, color: hex_color("#4682B4"), texture: this.textures.metal}),

            asteroid_mat: new Material(shader,
                {ambient: 0.4, diffusivity: 0.5, specularity: 0.2, color: hex_color("#808080"), texture: this.textures.asteroid})
        };

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
        this.lives = 5
        this.lasers = []
        this.spaceship = [];
        this.asteroids = []; // initialize an empty array to store the asteroids
        this.max_asteroids = 10; // set the maximum number of asteroids on screen

        // Don't create any DOM elements to control this scene:
        this.widget_options = {make_controls: false};

    }
    draw_spaceship(context, program_state, transform) {
        this.shapes.spaceship.draw(context, program_state, transform, this.materials.ship_metal);
    }

    draw_asteroids(context,program_state, transform) {

    }

    make_control_panel() {
        this.key_triggered_button("Up", ["w"], () => this.control.w = true,  "#6E6460",() => this.control.w = false);

        this.key_triggered_button("Left", ["a"], () => this.control.a = true,  "#6E6460",() => this.control.a = false);

        this.key_triggered_button("Down", ["s"], () => this.control.s = true,  "#6E6460",() => this.control.s = false);

        this.key_triggered_button("Right", ["d"], () => this.control.d = true,  "#6E6460",() => this.control.d = false);

        this.key_triggered_button("Shoot", ["\ "], () => {

        });

            this.key_triggered_button("Start", ['y'], () => {
            this.paused = false;
            this.begin = true;
        });

        this.key_triggered_button("View Environment", ["x"], () => this.attached = () => null);

    }
    display(context, program_state) {
        const t = program_state.animation_time;
        const dt = program_state.animation_delta_time / 1000;  // Convert delta time to seconds

        program_state.projection_transform = Mat4.perspective(Math.PI / 4, context.width / context.height, 1, 200);
        program_state.set_camera(Mat4.look_at(
            vec3(0, 15, 26),  // eye position (slightly above and behind)
            vec3(0, 10, 0),     // look at the origin (the spaceship)
            vec3(0, 2, 0)      // up direction
        ));
        program_state.lights = [new Light(vec4(10, 10, 20, 1), color(1, 1, 1, 1), 100000)];

        let ship_transform = Mat4.identity();
        ship_transform = ship_transform.times(Mat4.translation(0, 0, 0))
        this.shapes.spaceship.draw(context, program_state, ship_transform, this.materials.ship_metal);

        let asteroid_transform = Mat4.identity(); // xmin: -20, xmax: 20, ymin: 0 ,ymax: 21, z = 0
        asteroid_transform = asteroid_transform.times(Mat4.translation(0,  19,0))
                                               .times(Mat4.rotation(.00625 * t/2, 1 , 1, 1))
        this.shapes.asteroid.draw(context, program_state, asteroid_transform, this.materials.asteroid_mat);
        this.asteroid = asteroid_transform;

        let asteroid2_transform = Mat4.identity()
        asteroid2_transform = asteroid2_transform.times(Mat4.translation(7,  16,0))
                                                 .times(Mat4.rotation(.00625 * t/2, 0, 1, 1))
        this.shapes.asteroid2.draw(context, program_state, asteroid2_transform, this.materials.asteroid_mat);
        this.asteroid2 = asteroid2_transform;

        let asteroid3_transform = Mat4.identity()
        asteroid3_transform = asteroid3_transform.times(Mat4.translation(-10,  20,0))
                                                 .times(Mat4.rotation(.00625 * t/2, 1 , 1, 0))
        this.shapes.asteroid3.draw(context, program_state, asteroid3_transform, this.materials.asteroid_mat);
        this.asteroid3 = asteroid3_transform;

        let asteroid4_transform = Mat4.identity()
        asteroid4_transform = asteroid4_transform.times(Mat4.translation(-13,  13,0))
                                                 .times(Mat4.rotation(.00625 * t/2, 0 , 1, 1))
        this.shapes.asteroid4.draw(context, program_state, asteroid4_transform, this.materials.asteroid_mat);
        this.asteroid4 = asteroid4_transform;

        let asteroid5_transform = Mat4.identity()
        asteroid5_transform = asteroid5_transform.times(Mat4.translation(13,  9,0))
                                                 .times(Mat4.rotation(.00625 * t/2, 0 , 1, 1))
        this.shapes.asteroid5.draw(context, program_state, asteroid5_transform, this.materials.asteroid_mat);
        this.asteroid5 = asteroid5_transform;

        let asteroid6_transform = Mat4.identity()
        asteroid6_transform = asteroid6_transform.times(Mat4.translation(-3,  9,0))
                                                 .times(Mat4.rotation(.00625 * t/2, 0 , 1, 1))
        this.shapes.asteroid6.draw(context, program_state, asteroid6_transform, this.materials.asteroid_mat);
        this.asteroid6 = asteroid6_transform;

        let asteroid7_transform = Mat4.identity()
        asteroid7_transform = asteroid7_transform.times(Mat4.translation(-19,  5,0))
                                                 .times(Mat4.rotation(.00625 * t/2, 0 , 1, 1))
        this.shapes.asteroid7.draw(context, program_state, asteroid7_transform, this.materials.asteroid_mat);
        this.asteroid7 = asteroid7_transform;

        let asteroid8_transform = Mat4.identity()
        asteroid8_transform = asteroid8_transform.times(Mat4.translation(6,  5,0))
            .times(Mat4.rotation(.00625 * t/2, 0 , 1, 1))
        this.shapes.asteroid8.draw(context, program_state, asteroid8_transform, this.materials.asteroid_mat);
        this.asteroid8 = asteroid8_transform;

        let aleinship_transform = Mat4.identity(); // xmin: -20, xmax: 20, ymin: 0 ,ymax: 21, z = 0
        aleinship_transform = aleinship_transform.times(Mat4.translation(-2,  15,0))
            .times(Mat4.rotation(-.30, 1 , 0, 0))
        this.shapes.alienship.draw(context, program_state, aleinship_transform, this.materials.ship_metal.override(hex_color('#992828')));
        this.alienship = aleinship_transform;
    }

}