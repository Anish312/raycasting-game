"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
const NEAR_CLIPPING_PLANE = 0.25;
const FOV = Math.PI * 0.5;
const SCREEN_WIDTH = 300;
const PLAYER_STEP_LEN = 0.5;
const FAR_CLIPPING_PLANE = 10.0;
const PLAYER_SPEED = 1;
class Color {
    constructor(r, g, b, a) {
        this.r = r;
        this.g = g;
        this.b = b;
        this.a = a;
    }
    static red() {
        return new Color(1, 0, 0, 1);
    }
    static green() {
        return new Color(0, 1, 0, 1);
    }
    static blue() {
        return new Color(0, 0, 1, 1);
    }
    static yellow() {
        return new Color(1, 1, 0, 1);
    }
    static purple() {
        return new Color(1, 0, 1, 1);
    }
    static cyan() {
        return new Color(0, 1, 1, 1);
    }
    brightness(factor) {
        return new Color(factor * this.r, factor * this.g, factor * this.b, this.a);
    }
    toStyle() {
        return (`rgba(` +
            `${Math.floor(this.r * 255)},` +
            `${Math.floor(this.g * 255)},` +
            `${Math.floor(this.b * 255)},` +
            `${this.a})`);
    }
}
class Vector2 {
    add(that) {
        return new Vector2(this.x + that.x, this.y + that.y);
    }
    scale(value) {
        return new Vector2(this.x * value, this.y * value);
    }
    sub(that) {
        return new Vector2(this.x - that.x, this.y - that.y);
    }
    static fromAngle(angle) {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }
    static zero() {
        return new Vector2(0, 0);
    }
    div(that) {
        return new Vector2(this.x / that.x, this.y / that.y);
    }
    mul(that) {
        return new Vector2(this.x * that.x, this.y * that.y);
    }
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    dot(that) {
        return this.x * that.x + this.y * that.y;
    }
    sqrLength() {
        return this.x * this.x + this.y * this.y;
    }
    sqrDistanceTo(that) {
        return that.sub(this).sqrLength();
    }
    norm() {
        const l = this.length();
        if (l === 0)
            return new Vector2(0, 0);
        return new Vector2(this.x / l, this.y / l);
    }
    rot90() {
        return new Vector2(-this.y, this.x);
    }
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    lerp(that, t) {
        return that.sub(this).scale(t).add(this);
    }
    array() {
        return [this.x, this.y];
    }
    distanceTo(that) {
        return that.sub(this).length();
    }
}
const EPS = 1e-6;
function canvasSize(ctx) {
    return new Vector2(ctx.canvas.width, ctx.canvas.height);
}
// function mapToScreen(ctx : CanvasRenderingContext2D, p : Vector2): Vector2{
// }
function fillCircle(ctx, center, radius) {
    ctx.beginPath();
    ctx.arc(...center.array(), radius, 0, 2 * Math.PI);
    ctx.fill();
}
function strokeLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(...p1.array());
    ctx.lineTo(...p2.array());
    ctx.stroke();
}
function snap(x, dx) {
    if (dx > 0)
        return Math.ceil(x + Math.sign(dx) * EPS);
    if (dx < 0)
        return Math.floor(x + Math.sign(dx) * EPS);
    return x;
}
function hittingCell(p1, p2) {
    const d = p2.sub(p1);
    return new Vector2(Math.floor(p2.x + Math.sign(d.x) * EPS), Math.floor(p2.y + Math.sign(d.y) * EPS));
}
function rayStep(p1, p2) {
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
    }
    else {
        const y3 = snap(p2.y, d.y);
        const x3 = p2.x;
        p3 = new Vector2(x3, y3);
    }
    return p3;
}
function insideScene(scene, p) {
    const size = sceneSize(scene);
    return 0 <= p.x && p.x < size.x && 0 <= p.y && p.y < size.y;
}
function castRay(scene, p1, p2) {
    let start = p1;
    while (start.sqrDistanceTo(p1) < FAR_CLIPPING_PLANE * FAR_CLIPPING_PLANE) {
        const c = hittingCell(p1, p2);
        if (insideScene(scene, c) && scene[c.y][c.x] !== null) {
            break;
        }
        const p3 = rayStep(p1, p2);
        p1 = p2;
        p2 = p3;
    }
    return p2;
}
function sceneSize(scene) {
    const y = scene.length;
    let x = Number.MIN_VALUE;
    for (let row of scene) {
        x = Math.max(x, row.length);
    }
    return new Vector2(x, y);
}
function renderMinimap(ctx, player, position, size, scene) {
    ctx.save();
    const gridSize = sceneSize(scene);
    ctx.translate(...position.array());
    ctx.scale(...size.div(gridSize).array());
    ctx.lineWidth = 0.02;
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, ...gridSize.array());
    for (let y = 0; y < gridSize.x; y++) {
        for (let x = 0; x < gridSize.y; x++) {
            const cell = scene[y][x];
            if (cell instanceof Color) {
                ctx.fillStyle = cell.toStyle();
                ctx.fillRect(x, y, 1, 1);
            }
            else if (cell instanceof HTMLImageElement) {
                ctx.drawImage(cell, x, y, 1, 1);
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
    fillCircle(ctx, player.position, 0.2);
    const [p1, p2] = player.fovRange();
    ctx.strokeStyle = "white";
    strokeLine(ctx, p1, p2);
    strokeLine(ctx, player.position, p1);
    strokeLine(ctx, player.position, p2);
    //   if (p2 !== undefined) {
    //     for(;;) {
    //    fillCircle(ctx, p2, 0.2);
    //     ctx.strokeStyle = "magenta";
    //     strokeLine(ctx, p1, p2);
    //     const c  =hittingCell(p1,p2)
    //         if(c.x<0 || c.x >= gridSize.x ||c.y<0 ||c.y >= gridSize.y ||scene[c.y][c.x] ==1) {
    //             break;
    //         }
    //     const p3 =rayStep(p1,p2)
    //     p1 = p2;
    //     p2 = p3;
    //     }
    //   }
    ctx.restore();
}
class Player {
    constructor(position, direction) {
        this.position = position;
        this.direction = direction;
    }
    fovRange() {
        const l = Math.tan(FOV * 0.5) * NEAR_CLIPPING_PLANE;
        let p = this.position.add(Vector2.fromAngle(this.direction).scale(NEAR_CLIPPING_PLANE));
        const p1 = p.sub(p.sub(this.position).rot90().norm().scale(l));
        const p2 = p.add(p.sub(this.position).rot90().norm().scale(l));
        return [p1, p2];
    }
}
function distancePointToLine(p1, p2, p0) {
    const A = p2.y - p1.y;
    const B = p1.x - p2.x;
    const C = p2.x * p1.y - p1.x * p2.y;
    const distance = Math.abs((A * p0.x + B * p0.y + C) / Math.sqrt(A ** 2 + B ** 2));
    return distance;
}
function renderScene(ctx, player, scene) {
    const stripWidth = Math.ceil(ctx.canvas.width / SCREEN_WIDTH);
    const [r1, r2] = player.fovRange();
    for (let x = 0; x < SCREEN_WIDTH; ++x) {
        const p = castRay(scene, player.position, r1.lerp(r2, x / SCREEN_WIDTH));
        const c = hittingCell(player.position, p);
        if (insideScene(scene, c)) {
            const cell = scene[c.y][c.x];
            if (cell instanceof Color) {
                const v = p.sub(player.position);
                const d = Vector2.fromAngle(player.direction);
                const stripHeight = ctx.canvas.height / v.dot(d);
                ctx.fillStyle = cell.brightness(1 / v.dot(d)).toStyle();
                ctx.fillRect(x * stripWidth, (ctx.canvas.height - stripHeight) * 0.5, stripWidth, stripHeight);
            }
            else if (cell instanceof HTMLImageElement) {
                const v = p.sub(player.position);
                const d = Vector2.fromAngle(player.direction);
                const stripHeight = ctx.canvas.height / v.dot(d);
                const t = p.sub(c);
                let u = 0;
                if (Math.abs(t.x - 1) < EPS) { // Right wall
                    u = t.y;
                }
                else if (Math.abs(t.x) < EPS) { // Left wall
                    u = 1 - t.y;
                }
                else if (Math.abs(t.y - 1) < EPS) { // Top wall
                    u = 1 - t.x;
                }
                else if (Math.abs(t.y) < EPS) { // Bottom wall
                    u = t.x;
                }
                ctx.drawImage(cell, u * cell.width, 0, 1, cell.height, x * stripWidth, (ctx.canvas.height - stripHeight) * 0.5, stripWidth, stripHeight);
            }
        }
    }
}
function renderGame(ctx, player, scene) {
    const miniMapPosition = Vector2.zero().add(canvasSize(ctx).scale(0.05));
    const cellSize = ctx.canvas.width * 0.03;
    const miniMapSize = sceneSize(scene).scale(cellSize);
    ctx.fillStyle = "#181818";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    renderScene(ctx, player, scene);
    renderMinimap(ctx, player, miniMapPosition, miniMapSize, scene);
}
function loadImageData(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const image = new Image();
        image.src = url;
        return new Promise((resolve, reject) => {
            image.onload = () => {
                resolve(image);
            };
            image.onerror = reject;
        });
    });
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const game = document.getElementById("game");
    if (!game) {
        console.error("Canvas element with id 'game' not found.");
        return;
    }
    game.width = 1100;
    game.height = 700;
    const ctx = game.getContext("2d");
    if (!ctx) {
        console.error("CTX not found.");
        return;
    }
    const tsodingPog = yield loadImageData("images/realWall.jfif");
    const scene = [
        [null, null, tsodingPog, tsodingPog, null, null, null],
        [null, null, null, tsodingPog, null, null, null],
        [null, null, null, tsodingPog, tsodingPog, null, null],
        [null, null, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        [null, null, null, null, tsodingPog, null, null],
        [null, null, null, tsodingPog, null, null, null],
    ];
    const player = new Player(sceneSize(scene).mul(new Vector2(0.63, 0.63)), Math.PI * 2.5);
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
    let prevTimestamp = 0;
    const frame = (timestamp) => {
        const deltaTime = (timestamp - prevTimestamp) / 1000;
        prevTimestamp = timestamp;
        let velocity = Vector2.zero();
        let angularVelocity = 0.0;
        if (movingForward) {
            velocity = velocity.add(Vector2.fromAngle(player.direction).scale(PLAYER_SPEED));
        }
        if (movingBackward) {
            velocity = velocity.sub(Vector2.fromAngle(player.direction).scale(PLAYER_SPEED));
        }
        if (turningLeft) {
            angularVelocity -= Math.PI;
        }
        if (turningRight) {
            angularVelocity += Math.PI;
        }
        player.direction = player.direction + angularVelocity * deltaTime;
        player.position = player.position.add(velocity.scale(deltaTime));
        renderGame(ctx, player, scene);
        window.requestAnimationFrame(frame);
    };
    window.requestAnimationFrame((timestamp) => {
        prevTimestamp = timestamp;
        window.requestAnimationFrame(frame);
    });
}))();
//# sourceMappingURL=index.js.map