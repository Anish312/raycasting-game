const NEAR_CLIPPING_PLANE = 0.25;
const FOV = Math.PI * 0.5;
const SCREEN_WIDTH = 300;
const PLAYER_STEP_LEN = 0.5;
const FAR_CLIPPING_PLANE = 10.0;
const PLAYER_SPEED = 1;
const PLAYER_SIZE = 0.5;
class Color {
  r: number;
  g: number;
  b: number; 
  a: number;
  constructor(r: number, g: number, b: number, a: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  static red(): Color {
    return new Color(1, 0, 0, 1);
  }
  static green(): Color {
    return new Color(0, 1, 0, 1);
  }

  static blue(): Color {
    return new Color(0, 0, 1, 1);
  }

  static yellow(): Color {
    return new Color(1, 1, 0, 1);
  }
  static purple(): Color {
    return new Color(1, 0, 1, 1);
  }
  static cyan(): Color {
    return new Color(0, 1, 1, 1);
  }
  brightness(factor: number): Color {
    return new Color(factor * this.r, factor * this.g, factor * this.b, this.a);
  }

  toStyle(): string {
    return (
      `rgba(` +
      `${Math.floor(this.r * 255)},` +
      `${Math.floor(this.g * 255)},` +
      `${Math.floor(this.b * 255)},` +
      `${this.a})`
    );
  }
}

class Vector2 {
  add(that: Vector2): Vector2 {
    return new Vector2(this.x + that.x, this.y + that.y);
  }
  scale(value: number): Vector2 {
    return new Vector2(this.x * value, this.y * value);
  }
  sub(that: Vector2): Vector2 {
    return new Vector2(this.x - that.x, this.y - that.y);
  }
  static fromAngle(angle: number): Vector2 {
    return new Vector2(Math.cos(angle), Math.sin(angle));
  }
  static zero(): Vector2 {
    return new Vector2(0, 0);
  }

  static scaler(value : number) :Vector2 {
    return new Vector2(value, value)
  }

  div(that: Vector2): Vector2 {
    return new Vector2(this.x / that.x, this.y / that.y);
  }
  mul(that: Vector2): Vector2 {
    return new Vector2(this.x * that.x, this.y * that.y);
  }
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  dot(that: Vector2): number {
    return this.x * that.x + this.y * that.y;
  }
  sqrLength(): number {
    return this.x * this.x + this.y * this.y;
  }
  sqrDistanceTo(that: Vector2): number {
    return that.sub(this).sqrLength();
  }
  norm(): Vector2 {
    const l = this.length();
    if (l === 0) return new Vector2(0, 0);
    return new Vector2(this.x / l, this.y / l);
  }
  rot90(): Vector2 {
    return new Vector2(-this.y, this.x);
  }
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  lerp(that: Vector2, t: number): Vector2 {
    return that.sub(this).scale(t).add(this);
  }
  array(): [number, number] {
    return [this.x, this.y];
  }
  map(f:(x: number)=> number): Vector2{
    return new Vector2(f(this.x), f(this.y));
  } 
  distanceTo(that: Vector2) {
    return that.sub(this).length();
  }
}
const EPS = 1e-6;

function canvasSize(ctx: CanvasRenderingContext2D): Vector2 {
  return new Vector2(ctx.canvas.width, ctx.canvas.height);
}


function fillCircle(
  ctx: CanvasRenderingContext2D,
  center: Vector2,
  radius: number
) {
  ctx.beginPath();
  ctx.arc(...center.array(), radius, 0, 2 * Math.PI);
  ctx.fill();
}
function strokeLine(ctx: CanvasRenderingContext2D, p1: Vector2, p2: Vector2) {
  ctx.beginPath();
  ctx.moveTo(...p1.array());
  ctx.lineTo(...p2.array());
  ctx.stroke();
}

function snap(x: number, dx: number): number {
  if (dx > 0) return Math.ceil(x + Math.sign(dx) * EPS);
  if (dx < 0) return Math.floor(x + Math.sign(dx) * EPS);
  return x;
}

function hittingCell(p1: Vector2, p2: Vector2): Vector2 {
  const d = p2.sub(p1);
  return new Vector2(
    Math.floor(p2.x + Math.sign(d.x) * EPS),
    Math.floor(p2.y + Math.sign(d.y) * EPS)
  );
}

function rayStep(p1: Vector2, p2: Vector2): Vector2 {
  let p3 = p2;
  const d = p2.sub(p1);
  const eps = 1e-3;
  if (d.x !== 0) {
    const k = d.y / d.x;
    const c = p1.y - k * p1.x;

    {
      const x3 = snap(p2.x, d.x);
      const y3 = x3 * k + c;
      p3 = new Vector2(x3, y3);
    }

    if (k != 0) {
      const y3 = snap(p2.y, d.y);
      const x3 = (y3 - c) / k;
      const p3t = new Vector2(x3, y3);
      if (p2.sqrDistanceTo(p3t) < p2.sqrDistanceTo(p3)) {
        p3 = p3t;
      }
    }
  } else {
    const y3 = snap(p2.y, d.y);
    const x3 = p2.x;
    p3 = new Vector2(x3, y3);
  }
  return p3;
}
type Cell = Color | HTMLImageElement | null;


/// ========================= Scene ============================================

class Scene {
  cells : Array<Cell>
  width : number;
  height : number;
  constructor(cells: Array<Array<Cell>>) {
    this.height = cells.length;
    this.width = Number.MIN_VALUE;
    for(let row of cells) {
      this.width  = Math.max(this.width, row.length);
    }

    this.cells = [];
    for(let row of cells) {
      this.cells = this.cells.concat(row);
      for(let i = 0 ; i < this.width -row.length; ++i) {
        this.cells.push(null)
      }
    }
  }
  size() : Vector2 {
    return new Vector2(this.width, this.height);
  }

  contains(p: Vector2) :boolean {
    return 0<= p.x && p.y < this.width &&0 <=p.y &&p.y <this.height
  }
  getCell(p:Vector2) :Cell |undefined {
    if(!this.contains(p) ) return undefined; 
    const fp = p.map(Math.floor);
    return this.cells[fp.y*this.width +fp.x]
  }
  isWall(p:Vector2) :boolean {
    const c = this.getCell(p);
    return c !== null && c!== undefined 
  }
}


function castRay(scene: Scene, p1: Vector2, p2: Vector2): Vector2 {
  let start = p1;
  while (start.sqrDistanceTo(p1) < FAR_CLIPPING_PLANE * FAR_CLIPPING_PLANE) {
    const c = hittingCell(p1, p2);
    if (scene.getCell(c) !== undefined && scene.getCell(c) !== null) {
      break;
    }
    const p3 = rayStep(p1, p2);
    p1 = p2;
    p2 = p3;
  }
  return p2;
}

function renderMinimap(
  ctx: CanvasRenderingContext2D,
  player: Player,
  position: Vector2,
  size: Vector2,
  scene: Scene
) {
  ctx.save();
  const gridSize = scene.size();

  ctx.translate(...position.array());
  ctx.scale(...size.div(gridSize).array());
  ctx.lineWidth = 0.02;
  ctx.fillStyle = "#181818";
  ctx.fillRect(0, 0, ...gridSize.array());

  for (let y = 0; y < gridSize.x; y++) {
    for (let x = 0; x < gridSize.y; x++) {
      const cell = scene.getCell(new Vector2(x,y));

      if (cell instanceof Color) {
        ctx.fillStyle = cell.toStyle();
        ctx.fillRect(x, y, 1, 1);
      } else if (cell instanceof HTMLImageElement) {
        ctx.drawImage(cell ,x,y ,1,1)

        // ctx.drawImage(createImageBitmap(cell), x, y);
      }
    }
  }

  ctx.strokeStyle = "#303030";
  for (let x = 0; x <= gridSize.x; ++x) {
    strokeLine(ctx, new Vector2(x, 0), new Vector2(x, gridSize.y));
  }
  for (let y = 0; y <= gridSize.y; ++y) {
    strokeLine(ctx, new Vector2(0, y), new Vector2(gridSize.x, y));
  }

  ctx.fillStyle = "magenta";
  // fillCircle(ctx, player.position, 0.2);
  ctx.fillRect( player.position.x -PLAYER_SIZE*0.5, player.position.y -PLAYER_SIZE*0.5 ,PLAYER_SIZE, PLAYER_SIZE)
  const [p1, p2] = player.fovRange();

  ctx.strokeStyle = "white";
  strokeLine(ctx, p1, p2);

  strokeLine(ctx, player.position, p1);
  strokeLine(ctx, player.position, p2);

  ctx.restore();
}

class Player {
  position: Vector2;
  direction: number;
  constructor(position: Vector2, direction: number) {
    this.position = position;
    this.direction = direction;
  }
  fovRange(): [Vector2, Vector2] {
    const l = Math.tan(FOV * 0.5) * NEAR_CLIPPING_PLANE;

    let p = this.position.add(
      Vector2.fromAngle(this.direction).scale(NEAR_CLIPPING_PLANE)
    );
    const p1 = p.sub(p.sub(this.position).rot90().norm().scale(l));
    const p2 = p.add(p.sub(this.position).rot90().norm().scale(l));
    return [p1, p2];
  }
}

function distancePointToLine(p1: Vector2, p2: Vector2, p0: Vector2): number {
  const A: number = p2.y - p1.y;
  const B: number = p1.x - p2.x;
  const C: number = p2.x * p1.y - p1.x * p2.y;

  const distance: number = Math.abs(
    (A * p0.x + B * p0.y + C) / Math.sqrt(A ** 2 + B ** 2)
  );
  return distance;
}

function renderScene(
  ctx: CanvasRenderingContext2D,
  player: Player,
  scene: Scene
) {
  const stripWidth = Math.ceil(ctx.canvas.width / SCREEN_WIDTH);
  const [r1, r2] = player.fovRange();
  for (let x = 0; x < SCREEN_WIDTH; ++x) {
    const p = castRay(scene, player.position, r1.lerp(r2, x / SCREEN_WIDTH));
    const c = hittingCell(player.position, p);
    
    const cell = scene.getCell(c);
 
      if (cell instanceof Color) {
        const v = p.sub(player.position);
        const d = Vector2.fromAngle(player.direction);
        const stripHeight = ctx.canvas.height / v.dot(d);
        ctx.fillStyle = cell.brightness(1 / v.dot(d)).toStyle();
        ctx.fillRect(
          x * stripWidth,
          (ctx.canvas.height - stripHeight) * 0.5,
          stripWidth,
          stripHeight
        );
      } else if (cell instanceof HTMLImageElement) {
        const v = p.sub(player.position);
        const d = Vector2.fromAngle(player.direction);
        const stripHeight = ctx.canvas.height / v.dot(d);

        const t = p.sub(c)

       let u = 0;
       if (Math.abs(t.x - 1) < EPS) { // Right wall
         u = t.y;
       } else if (Math.abs(t.x) < EPS) { // Left wall
         u = 1 - t.y;
       } else if (Math.abs(t.y - 1) < EPS) { // Top wall
         u = 1 - t.x;
       } else if (Math.abs(t.y) < EPS) { // Bottom wall
         u = t.x;
       }
      
        ctx.drawImage( cell, u*cell.width , 0 ,1, cell.height,x * stripWidth,
          (ctx.canvas.height - stripHeight) * 0.5,
          stripWidth,
          stripHeight)

      }

  }
}

function renderGame(
  ctx: CanvasRenderingContext2D,
  player: Player,
  scene: Scene
) {
  const miniMapPosition = Vector2.zero().add(canvasSize(ctx).scale(0.05));
  const cellSize = ctx.canvas.width * 0.03;
  const miniMapSize = scene.size().scale(cellSize);

  ctx.fillStyle = "#303030";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = "#181818";
  ctx.fillRect(0,ctx.canvas.height*0.5 , ctx.canvas.width , ctx.canvas.height*0.5);
  renderScene(ctx, player, scene);
  renderMinimap(ctx, player, miniMapPosition, miniMapSize, scene);
}

async function loadImageData(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  return new Promise((resolve, reject) => {
    image.onload = () => {
    
      resolve(image);
    };
    image.onerror = reject;
  });
}


function canPlayerGoThere(scene: Scene , newPosition: Vector2) : boolean{
  const corner = newPosition.sub(Vector2.scaler(PLAYER_SIZE *0.5))
  for(let dx =0;dx<2;++dx){
    for(let dy =0;dy<2;++dy){
     if(scene.isWall( corner.add(new Vector2(dx, dy).scale(PLAYER_SIZE)))) {
      return false;
     }
    }
  }
  return true
}


( async() => {
  const game = document.getElementById("game") as HTMLCanvasElement;

  if (!game) {
    console.error("Canvas element with id 'game' not found.");
    return;
  }

  game.width = 1100;
  game.height = 700;
  const ctx = game.getContext("2d") as CanvasRenderingContext2D;

  if (!ctx) {
    console.error("CTX not found.");
    return;
  }

  const tsodingPog = await loadImageData("images/realWall.jfif")

  const scene :Scene  =  new Scene([
    [null, null, tsodingPog, tsodingPog, null, null, null], 
   [ null, null, null, tsodingPog, null, null, null],
    [null, null, null, tsodingPog, tsodingPog, null, null],
   [ null, null, null, null, null, null, null],
   [ null, null, null, null, null, null, null],
  [ null, null, null, null, tsodingPog, null, null],
  [  null, null, null, tsodingPog, null, null, null],
 ]);

  const player = new Player(
   scene.size().mul(new Vector2(0.63, 0.63)),
    Math.PI * 2.5
  );
  let movingForward = false;
  let movingBackward = false;
  let turningLeft = false;
  let turningRight = false;
  window.addEventListener("keydown", (e) => {
    if (!e.repeat) {
      switch (e.code) {
        case "KeyW":
          {
            movingForward = true;
          }
          break;
        case "KeyS":
          {
            movingBackward = true;
          }
          break;

        case "KeyA":
          {
            turningLeft = true;
          }
          break;
        case "KeyD":
          {
            turningRight = true;
          }
          break;
      }
    }
  });
  window.addEventListener("keyup", (e) => {
    if (!e.repeat) {
      switch (e.code) {
        case "KeyW":
          {
            movingForward = false;
          }
          break;
        case "KeyS":
          {
            movingBackward = false;
          }
          break;
        case "KeyA":
          {
            turningLeft = false;
          }
          break;
        case "KeyD":
          {
            turningRight = false;
          }
          break;
      }
    }
  });
  let prevTimestamp: number = 0;
  const frame = (timestamp: number) => {
    const deltaTime = (timestamp - prevTimestamp) / 1000;
    prevTimestamp = timestamp;
    let velocity = Vector2.zero();
    let angularVelocity = 0.0;
    if (movingForward) {
      velocity = velocity.add(
        Vector2.fromAngle(player.direction).scale(PLAYER_SPEED)
      );
    }
    if (movingBackward) {
      velocity = velocity.sub(
        Vector2.fromAngle(player.direction).scale(PLAYER_SPEED)
      );
    }
    if (turningLeft) {
      angularVelocity -= Math.PI;
    }
    if (turningRight) {
      angularVelocity += Math.PI;
    }

    player.direction = player.direction + angularVelocity * deltaTime;
    const newPosition = player.position.add(velocity.scale(deltaTime));

    if(canPlayerGoThere(scene, newPosition)){
      player.position = newPosition;

    }
    renderGame(ctx, player, scene);
    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame((timestamp) => {
    prevTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  });
})();
