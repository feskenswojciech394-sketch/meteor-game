import { actorTexture, talkBubble } from '../art/actors.js';
import { scenery, propTexture } from '../art/scenery.js';
import { terrainTexture } from '../art/terrain.js';
import { blocks, surface } from '../art/pixels.js';

const WALK_SPEED = 67;
const TALK_RADIUS = 27;
const CAMERA_LERP = 0.1; // per 60 Hz physics tick
const MAX_CATCHUP_MS = 250;

function drawCoordinate(previous, current, alpha, scroll) {
  // A stationary foot stays on one world pixel while the camera finishes easing.
  if (previous === current) return Math.round(current);
  const world = Phaser.Math.Linear(previous, current, alpha);
  return Math.round(scroll) + Math.round(world - scroll);
}

export class TownScene extends Phaser.Scene {
  constructor(map, ui, playerArt) {
    super('town');
    this.map = map;
    this.ui = ui;
    this.playerArt = playerArt;
  }

  create() {
    const { tiles, tileSize, spawn, npcs } = this.map;
    this.worldWidth = tiles[0].length * tileSize;
    this.worldHeight = tiles.length * tileSize;
    this.physics.world.setBounds(0,0,this.worldWidth,this.worldHeight);
    this.cameras.main.setBounds(0,0,this.worldWidth,this.worldHeight);
    this.textures.addCanvas('ground', terrainTexture(this.map));
    this.add.image(0,0,'ground').setOrigin(0).setDepth(-100);
    this.solids = this.physics.add.staticGroup();
    this.barriers = [];
    tiles.forEach((row,y) => [...row].forEach((tile,x) => {
      if (tile === '#' || tile === '~') this.addSolid(x*tileSize,y*tileSize,tileSize,tileSize);
    }));
    for (const prop of this.map.props) this.addProp(prop);
    this.createActors();

    // Rendered sprites use their feet as the origin. A small separate body slides along walls.
    this.walker = this.add.zone(spawn[0],spawn[1]-3,10,6);
    this.physics.add.existing(this.walker);
    this.body = this.walker.body;
    this.body.setCollideWorldBounds(true);
    this.physics.add.collider(this.walker,this.solids);
    this.facing = 'down';
    this.strideDistance = 0;
    this.player = this.add.image(...spawn, 'hero', this.playerArt.directions.down.idle).setOrigin(.5,1);
    this.marker = this.add.image(...spawn,'player-marker').setOrigin(.5,1);
    this.stepMs = 1000 / this.physics.world.fps;
    this.remainderMs = 0;
    this.previousFeet = new Phaser.Math.Vector2(...spawn);
    this.scroll = new Phaser.Math.Vector2();
    this.previousScroll = new Phaser.Math.Vector2();
    this.scrollTarget = new Phaser.Math.Vector2();
    this.ui.onStop = () => {
      this.body.stop();
      this.previousFeet.set(this.body.center.x, this.body.bottom);
      this.stand();
    };

    this.people = npcs.map(person => {
      const [x,y] = person.at;
      this.add.image(x,y,'keeper').setOrigin(.5,1).setDepth(y);
      this.addSolid(x-5,y-5,10,5,person.id);
      const bubble = this.add.image(x,y-27,'talk-bubble').setOrigin(.5,1).setDepth(y+.2);
      return {person,bubble};
    });
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.resize();
    this.scale.on('resize',this.resize,this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.resize, this);
      this.ui.onStop = null;
    });
    this.update(0, 0);
    document.getElementById('pause').disabled = false;
    document.getElementById('loading').hidden = true;
  }

  addSolid(x,y,width,height,owner = null) {
    this.solids.add(this.add.zone(x+width/2,y+height/2,width,height));
    this.barriers.push({rect:new Phaser.Geom.Rectangle(x,y,width,height), owner});
  }

  addProp([kind,x,y,count]) {
    const definition = scenery[kind];
    const variant = kind === 'fence' ? count : Math.abs(x*7+y*13)%3;
    const key = kind+'-'+variant;
    if (!this.textures.exists(key)) this.textures.addCanvas(key,propTexture(kind,variant));
    const image = this.add.image(x,y,key).setOrigin(.5,1);
    image.setDepth(['garden','flowers','reeds'].includes(kind) ? -1 : y);
    const footprint = kind === 'fence' ? [-image.width/2,-11,image.width,9] : definition.body;
    if (footprint) {
      const [dx,dy,w,h] = footprint;
      this.addSolid(x+dx,y+dy,w,h);
    }
  }

  createActors() {
    this.textures.addSpriteSheet('hero', this.playerArt.sheet, this.playerArt);
    this.textures.addCanvas('keeper',actorTexture('keeper'));
    this.textures.addCanvas('talk-bubble',talkBubble());
    const ctx = surface(9,6);
    blocks(ctx,'#5a5739',[0,0,9,2],[1,2,7,1],[2,3,5,1],[3,4,3,1],[4,5,1,1]);
    blocks(ctx,'#ffda83',[1,0,7,1],[2,1,5,1],[3,2,3,1],[4,3,1,1]);
    this.textures.addCanvas('player-marker',ctx.canvas);
  }

  resize() {
    const camera = this.cameras.main;
    if (this.viewWidth === camera.width && this.viewHeight === camera.height) return;
    this.viewWidth = camera.width;
    this.viewHeight = camera.height;
    const zoom = Math.max(camera.width/this.worldWidth, camera.height/this.worldHeight);
    camera.setZoom(zoom).setRoundPixels(true);
    this.lookAhead = Phaser.Math.Clamp(235 - camera.height / zoom, 22, 42);
    camera.getScroll(this.body.center.x, this.body.bottom - this.lookAhead, this.scroll);
    this.previousScroll.copy(this.scroll);
  }

  nearestPerson(x,y) {
    let closest = null, distance = TALK_RADIUS;
    for (const {person} of this.people) {
      const [px,py] = person.at;
      const d = Math.hypot(px-x,py-y);
      if (d > distance) continue;
      const sight = new Phaser.Geom.Line(x,y-3,px,py-3);
      if (this.barriers.some(({rect,owner}) => owner !== person.id && Phaser.Geom.Intersects.LineToRectangle(sight,rect))) continue;
      closest = person;
      distance = d;
    }
    return closest;
  }

  stand() {
    this.strideDistance = 0;
    this.showFrame(this.playerArt.directions[this.facing].idle);
  }

  showFrame(frame) {
    if (this.player.frame.name !== frame) this.player.setFrame(frame);
  }

  advancePose(distance) {
    if (distance < 1e-6) {
      this.stand();
      return;
    }
    const frames = this.playerArt.directions[this.facing].walk;
    const stride = this.playerArt.stridePixels;
    this.strideDistance = (this.strideDistance + distance) % stride;
    this.showFrame(frames[Math.floor(this.strideDistance / stride * frames.length)]);
  }

  stepPlayer() {
    const input = this.ui.direction(this.stepMs);
    if (input.x || input.y) {
      const horizontal = Math.abs(input.x) > Math.abs(input.y);
      this.facing = horizontal ? (input.x < 0 ? 'left' : 'right') : (input.y < 0 ? 'up' : 'down');
    }
    this.previousFeet.set(this.body.center.x, this.body.bottom);
    this.body.setVelocity(input.x * WALK_SPEED, input.y * WALK_SPEED);
    // Arcade integrates velocity and resolves collisions before we measure the step.
    this.physics.world.singleStep();
    const x = this.body.center.x, y = this.body.bottom;
    this.advancePose(Math.hypot(x - this.previousFeet.x, y - this.previousFeet.y));

    this.previousScroll.copy(this.scroll);
    this.cameras.main.getScroll(x, y - this.lookAhead, this.scrollTarget);
    this.scroll.lerp(this.scrollTarget, CAMERA_LERP);
  }

  renderPlayer(alpha) {
    const lerp = Phaser.Math.Linear;
    const sx = lerp(this.previousScroll.x, this.scroll.x, alpha);
    const sy = lerp(this.previousScroll.y, this.scroll.y, alpha);
    this.cameras.main.setScroll(Math.round(sx), Math.round(sy));
    // Snap the screen-space displacement once so the player and camera share a pixel grid.
    const px = drawCoordinate(this.previousFeet.x, this.body.center.x, alpha, sx);
    const py = drawCoordinate(this.previousFeet.y, this.body.bottom, alpha, sy);
    this.player.setPosition(px, py).setDepth(py + .1);
    this.marker.setPosition(px, py - this.player.height - 2).setDepth(py + .2);
  }

  update(time, delta) {
    // Keep the fractional tick for rendering. Limit catch-up after a suspended tab.
    this.remainderMs += Math.min(delta, MAX_CATCHUP_MS);
    while (this.remainderMs + 1e-8 >= this.stepMs) {
      this.stepPlayer();
      this.remainderMs -= this.stepMs;
    }
    this.remainderMs = Math.max(0, this.remainderMs);
    this.renderPlayer(this.remainderMs / this.stepMs);

    const bob = this.reducedMotion || this.ui.blocked ? 0 : Math.round(Math.sin(time/380));
    for (const {person,bubble} of this.people) bubble.y = person.at[1]-27+bob;
    const px = Math.round(this.body.center.x), py = Math.round(this.body.bottom);
    const nearby = this.nearestPerson(px,py);
    if (nearby !== this.ui.nearby) this.ui.setNearby(nearby);
    const area = this.map.areas.find(({rect:[x,y,w,h]}) => px >= x && py >= y && px < x+w && py < y+h);
    this.ui.setArea(area?.name ?? this.map.defaultArea);
  }
}
