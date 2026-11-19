import { actorTexture, talkBubble } from '../art/actors.js';
import { scenery, propTexture } from '../art/scenery.js';
import { terrainTexture } from '../art/terrain.js';
import { blocks, surface } from '../art/pixels.js';

const WALK_SPEED = 67;
const TALK_RADIUS = 27;

export class TownScene extends Phaser.Scene {
  constructor(map, ui) {
    super('town');
    this.map = map;
    this.ui = ui;
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
    this.ui.onStop = () => this.body.stop();
    this.facing = 'down';
    this.walkTime = 0;
    this.player = this.add.image(...spawn,'hero-down-0').setOrigin(.5,1);
    this.marker = this.add.image(...spawn,'player-marker').setOrigin(.5,1);

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
    this.events.once('shutdown',() => this.scale.off('resize',this.resize,this));
    this.renderPlayer(0,0);
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
    for (const direction of ['down','up','left','right']) {
      for (const step of [0,1,2]) this.textures.addCanvas('hero-'+direction+'-'+step,actorTexture('hero',direction,step));
    }
    this.textures.addCanvas('keeper',actorTexture('keeper'));
    this.textures.addCanvas('talk-bubble',talkBubble());
    const ctx = surface(9,6);
    blocks(ctx,'#5a5739',[0,0,9,2],[1,2,7,1],[2,3,5,1],[3,4,3,1],[4,5,1,1]);
    blocks(ctx,'#ffda83',[1,0,7,1],[2,1,5,1],[3,2,3,1],[4,3,1,1]);
    this.textures.addCanvas('player-marker',ctx.canvas);
  }

  resize() {
    const camera = this.cameras.main;
    const zoom = Math.max(camera.width/this.worldWidth, camera.height/this.worldHeight);
    camera.setZoom(zoom);
    this.followPlayer();
  }

  followPlayer() {
    const camera = this.cameras.main;
    const visibleHeight = camera.height / camera.zoom;
    const lookAhead = Phaser.Math.Clamp(235 - visibleHeight, 22, 42);
    camera.centerOn(this.body.center.x,this.body.bottom-lookAhead);
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

  renderPlayer(time,delta) {
    const {x,y} = this.body.velocity;
    const walking = Math.abs(x)+Math.abs(y) > 1;
    if (walking) {
      this.facing = Math.abs(x) > Math.abs(y) ? (x < 0 ? 'left':'right') : (y < 0 ? 'up':'down');
      this.walkTime += delta;
    } else this.walkTime = 0;
    const step = walking ? 1+Math.floor(this.walkTime/155)%2 : 0;
    const px = Math.round(this.body.center.x), py = Math.round(this.body.bottom);
    this.player.setPosition(px,py).setDepth(py+.1).setTexture('hero-'+this.facing+'-'+step);
    this.marker.setPosition(px,py-28).setDepth(py+.2);
    const bob = this.reducedMotion || this.ui.blocked ? 0 : Math.round(Math.sin(time/380));
    for (const {person,bubble} of this.people) bubble.y = person.at[1]-27+bob;
    const nearby = this.nearestPerson(px,py);
    if (nearby !== this.ui.nearby) this.ui.setNearby(nearby);
    const area = this.map.areas.find(({rect:[x,y,w,h]}) => px >= x && py >= y && px < x+w && py < y+h);
    this.ui.setArea(area?.name ?? this.map.defaultArea);
    this.followPlayer();
  }

  update(time,delta) {
    const input = this.ui.direction();
    this.body.setVelocity(input.x*WALK_SPEED,input.y*WALK_SPEED);
    this.renderPlayer(time,delta);
  }
}
