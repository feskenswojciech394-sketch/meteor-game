import { blocks, stamp, surface } from './pixels.js';

const heroInk = {h:'#34463c', l:'#53634c', f:'#e6b482', s:'#bc865f', e:'#383d34', a:'#f0c578', o:'#b5603e'};
const keeperInk = {h:'#5a6151', l:'#d5d2b6', f:'#d4a77e', s:'#a47d60', e:'#3b453c', a:'#ede1be', o:'#839183'};
const faces = {
  down: [
    '...hhhhhh...', '..hllllhhhh.', '.hllhhhhhhh.', '.hhhffffffh.',
    '..hfefffefh.', '..sfffsfffs.', '...sfffffs..', '....sssss...'
  ],
  side: [
    '...hhhhhh...', '..hhlllhhh..', '.hhhhhhhhhh.', '.hhhhfffff..',
    '..hhhffeff..', '..hhfsffffs.', '...hhfffff..', '.....ssss...'
  ],
  up: [
    '...hhhhhh...', '..hllllhhh..', '.hllhhhhhhh.', '.hhhhhhhhhh.',
    '..hhhlhhhhh.', '..shhhhhhs..', '...shhhhhs..', '....sssss...'
  ]
};
const keeperFace = [
  '...hhhhhh...', '..hllllllhh.', '.hlllaalllh.', '.hhlffffllh.',
  '..heeeeeeef.', '..sffffsffs.', '...slallls..', '....sssss...'
];

export function actorTexture(role, facing = 'down', step = 0) {
  const ctx = surface(20,26);
  const keeper = role === 'keeper';
  const coat = keeper ? '#809584' : '#bc6844';
  const shade = keeper ? '#4e6b62' : '#905139';
  const trim = keeper ? '#d7ceb2' : '#eb9a5b';
  const shift = step === 1 ? -1 : 0;
  const left = step === 1 ? -1 : 0, right = step === 2 ? -1 : 0;
  blocks(ctx,'#273c344f',[3,22,14,3],[5,21,10,1],[5,25,10,1]);
  ctx.save();
  if (facing === 'left') { ctx.translate(20,0); ctx.scale(-1,1); }
  blocks(ctx,'#38483e',[6,17,4,6+left],[11,17,4,6+right]);
  blocks(ctx,'#52625b',[7,18,2,3+left],[12,18,2,3+right]);
  blocks(ctx,'#413f33',[5,22+left,5,2],[11,22+right,5,2]);
  ctx.translate(0,shift);
  blocks(ctx,'#424b3a',[5,10,10,9],[4,12,12,6]);
  blocks(ctx,coat,[6,11,8,7],[4,12,2,4],[14,12,2,4]);
  blocks(ctx,shade,[12,12,2,6],[5,16,2,2],[6,18,8,1]);
  blocks(ctx,trim,[6,11,6,1],[5,12,2,2]);
  blocks(ctx,'#d9a578',[4,16,2,2],[14,16,2,2]);
  if (keeper) {
    blocks(ctx,'#425d59',[7,12,6,7],[8,11,1,1],[12,11,1,1]);
    blocks(ctx,'#9aa68c',[8,15,4,1]);
  } else if (facing === 'up') {
    blocks(ctx,'#694d33',[7,12,7,6]);
    blocks(ctx,'#bf8e53',[8,12,5,4]);
    blocks(ctx,'#f1c576',[9,14,2,1]);
  } else {
    for (let i = 0; i < 5; i++) blocks(ctx,'#664e37',[12-i,12+i,2,1]);
    blocks(ctx,'#e8b960',[7,10,6,2],[7,12,3,2]);
    blocks(ctx,'#785538',[5,16,5,3]);
    blocks(ctx,'#d1a461',[6,16,3,1]);
  }
  const face = facing === 'left' || facing === 'right' ? 'side' : facing;
  stamp(ctx,keeper ? keeperFace : faces[face],keeper ? keeperInk : heroInk,4,3);
  ctx.restore();
  return ctx.canvas;
}

const directions = ['down', 'left', 'right', 'up'];

function placeholderSheet() {
  const ctx = surface(3 * 20, directions.length * 26);
  directions.forEach((direction, row) => {
    for (const step of [0, 1, 2]) {
      ctx.drawImage(actorTexture('hero', direction, step), step * 20, row * 26);
    }
  });
  return ctx.canvas;
}

export async function loadPlayerArt(config) {
  let sheet;
  if (config.image) {
    sheet = new Image();
    sheet.src = config.image;
    await sheet.decode();
  } else {
    sheet = placeholderSheet();
  }

  const {frameWidth, frameHeight, stridePixels} = config;
  if (![frameWidth, frameHeight].every(n => Number.isInteger(n) && n > 0) ||
      !Number.isFinite(stridePixels) || stridePixels <= 0) {
    throw new Error('assets/player.json: invalid frame dimensions or stridePixels');
  }
  const frameCount = Math.floor(sheet.width / frameWidth) * Math.floor(sheet.height / frameHeight);
  const validFrame = n => Number.isInteger(n) && n >= 0 && n < frameCount;
  for (const direction of directions) {
    const pose = config.directions?.[direction];
    if (!validFrame(pose?.idle) || !Array.isArray(pose.walk) || !pose.walk.length || !pose.walk.every(validFrame)) {
      throw new Error('assets/player.json: invalid frames for ' + direction);
    }
  }
  return {...config, sheet};
}

export function talkBubble() {
  const ctx = surface(15,12);
  blocks(ctx,'#3a4c3c',[2,0,11,1],[0,2,15,6],[1,1,13,8],[3,9,8,1],[5,10,3,1],[5,11,1,1]);
  blocks(ctx,'#f3e5c0',[2,1,11,7],[1,2,13,5],[3,8,7,1],[5,9,3,1],[5,10,1,1]);
  blocks(ctx,'#5b6250',[3,4,2,2],[7,4,2,2],[11,4,2,2]);
  return ctx.canvas;
}

export function drawPortrait(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(actorTexture('keeper'),3,2,14,14,0,1,24,24);
}
