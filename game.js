// Global Variables
export class Game {
  constructor() {
    // create a shallow copy of the initial position matrix
    this._matrix = POSITION_MATRIX.map((row) => [...row]);
    this._enemies = this._getEnemies();
  }

  // GETTERS
  // movable characters
  getEnemies() {
    return this._enemies.map((enemy) => ({
      ...enemy,
      position: {
        x: enemy.position.c,
        y: enemy.position.r,
        z: enemy.position.z,
      }
    }));
  }

  _getEnemies() {
    // return { index in 2D array, initial direction}
    return [
      {
        position: {
          r: 10,
          c: 10,
          z: 0,
        },
        direction: DIRS.RIGHT,
      },
    ];
  }

  // asteroids
  getAsteroids() {
    let asteroidsPosition = [];
    // linearly go through 2D array
    // get x, y, z coordinates of each asteroid
    this._matrix.forEach((row, r) => {
      row.forEach((obj, c) => {
        // parse out all asteroids
        if (obj === OBJ.ASTEROID) {
          // push X, Y coordinates based on their 2D array index
          // note: column index => x coord, row index => y coord
          asteroidsPosition.push({
            x: c,
            y: r,
            z: 0,
          });
        }
      });
    });

    return asteroidsPosition;
  }
}

export const DIRS = Object.freeze({
  NONE: Object.freeze({ j: 0, i: 0, rotation: 0 }),
  DOWN: Object.freeze({ j: 0, i: 1, rotation: 0 }),
  RIGHT: Object.freeze({ j: 1, i: 0, rotation: 0.5 * Math.PI }),
  UP: Object.freeze({ j: 0, i: -1, rotation: Math.PI }),
  LEFT: Object.freeze({ j: -1, i: 0, rotation: 1.5 * Math.PI }),
});

const OBJ = Object.freeze({
  EMPTY: 0,
  ASTEROID: 1,
});

// ordered by column
const POSITION_MATRIX = [
  ...new Array(13).fill(new Array(28).fill(OBJ.EMPTY)),
  new Array(28).fill(OBJ.ASTEROID),
  ...new Array(14).fill(new Array(28).fill(OBJ.EMPTY)),
];
