import { blocks, randomStream, shape, stamp, surface } from './pixels.js';

function shadow(ctx, x, y, w) {
  blocks(ctx, '#263c3354', [x+3,y-2,w-6,2], [x,y,w,3], [x+4,y+3,w-8,1]);
}

function pine(ctx, variant) {
  const palettes = [
    ['#2d493b','#385945','#476e4e','#5c8455','#79985e'],
    ['#314e3d','#3d6047','#4d7250','#628858','#839e63'],
    ['#294538','#345641','#42694b','#567d52','#71915b']
  ];
  const [edge,deep,mid,leaf,light] = palettes[variant];
  shadow(ctx,5,46,35);
  blocks(ctx, '#414935', [18,34,8,15], [16,48,12,2]);
  blocks(ctx, '#7c6947', [20,37,4,11], [18,48,4,1]);
  blocks(ctx, '#a08552', [20,41,1,6]);
  const layers = [[2,17,19], [8,28,26], [15,37,33], [23,45,41]];
  for (const [start,end,w] of [...layers].reverse()) {
    const peak = 21, y = start + variant, low = end + variant;
    const left = peak - Math.floor(w/2), right = peak + Math.floor(w/2);
    shape(ctx,edge,[[peak-1,y],[peak+1,y],[right-3,low-6],[right,low-5],[right-2,low-4],[right+1,low-1],[right-6,low],[right-7,low+1],[peak+3,low],[peak,low+2],[left+5,low],[left,low],[left+2,low-3],[left-1,low-3],[left+4,low-8]],2);
    shape(ctx,deep,[[peak,y+2],[right-3,low-5],[right-2,low-2],[peak+3,low-1],[peak,low],[left+2,low-2]],2);
    shape(ctx,mid,[[peak-1,y+1],[peak+3,y+6],[peak+2,y+9],[peak+6,low-4],[peak+1,low-3],[peak+1,low-2],[left+3,low-3]],2);
    shape(ctx,leaf,[[peak-1,y],[peak,y+5],[peak-3,y+9],[peak-2,y+9],[peak-6,low-4],[left+4,low-3],[left+7,low-7],[left+5,low-7]],2);
    blocks(ctx,light,[left+6,low-6,3,1],[peak-4,y+6,2,1]);
  }
}

function crown(ctx, x, y, w, h, color) {
  shape(ctx,color,[[x+w*.32,y],[x+w*.64,y],[x+w*.67,y+2],[x+w*.84,y+3],[x+w*.84,y+5],[x+w*.96,y+h*.37],[x+w,y+h*.65],[x+w*.9,y+h*.78],[x+w*.82,y+h*.78],[x+w*.77,y+h*.94],[x+w*.47,y+h],[x+w*.38,y+h-2],[x+w*.19,y+h-2],[x+w*.13,y+h*.8],[x+1,y+h*.73],[x,y+h*.44],[x+2,y+h*.32],[x+3,y+h*.16],[x+w*.27,y+2]],2);
}

function oak(ctx, variant) {
  const tones = [
    ['#384f38','#4b6541','#628149','#7f9850','#9eac60'],
    ['#3a543b','#4f7047','#6d8a4e','#8b9e55','#acb66a'],
    ['#354e39','#446740','#5c8049','#77944f','#97a85b']
  ][variant];
  shadow(ctx,5,39,37);
  blocks(ctx,'#474833',[18,25,8,18],[15,41,14,2],[14,32,5,3],[26,29,4,3]);
  blocks(ctx,'#806a42',[20,30,4,12],[16,32,5,2],[24,31,4,2]);
  blocks(ctx,'#9b8050',[20,34,1,7]);
  crown(ctx,2,4,39,30,tones[0]);
  crown(ctx,0,13,21,18,tones[0]);
  crown(ctx,20,11,23,21,tones[0]);
  crown(ctx,4,5,33,25,tones[1]);
  crown(ctx,1,10,23,19,tones[2]);
  crown(ctx,20,8,19,19,tones[2]);
  crown(ctx,10,1,22,19,tones[2]);
  crown(ctx,6,8,15,13,tones[3]);
  crown(ctx,14,2,13,14,tones[3]);
  const rng = randomStream(171+variant);
  for (let i = 0; i < 25; i++) {
    const x = 6 + Math.floor(rng()*29), y = 7 + Math.floor(rng()*17);
    blocks(ctx, i%3 === 0 ? tones[4] : tones[1], [x,y,2,1], [x+2,y-1,1,1]);
  }
}

function shop(ctx) {
  const wood = '#594c37', dark = '#394336', beam = '#79633f', trim = '#dfc391';
  shadow(ctx,5,90,122);
  // Timber frame, deep side wall and plank porch.
  shape(ctx,'#50513b',[[8,47],[102,45],[121,42],[121,84],[104,92],[8,92]]);
  blocks(ctx,'#c9ad7a',[10,49,93,38]);
  shape(ctx,'#9e8059',[[103,50],[119,43],[119,82],[103,88]]);
  for (let y = 55; y < 86; y += 5) {
    blocks(ctx,'#b99b6c',[11,y,89,1]);
    for (let x = 104; x < 119; x++) blocks(ctx,'#8d7451',[x,y-Math.floor((x-103)/3),1,1]);
  }
  blocks(ctx,wood,[9,48,4,40],[99,48,5,40],[118,44,3,38],[47,51,3,36],[71,51,3,36]);
  blocks(ctx,beam,[10,54,1,32],[100,54,1,32]);
  blocks(ctx,'#74583d',[7,86,99,7],[5,91,102,3]);
  blocks(ctx,'#c29c69',[7,86,99,2],[5,91,102,1]);
  for (let x = 13; x < 106; x += 12) blocks(ctx,'#866846',[x,88,1,3]);
  shape(ctx,'#5b4837',[[105,86],[122,80],[122,85],[105,93]]);
  // Windows reflect the sky above shelves of block-colour goods.
  for (const x of [17,74]) {
    const w = x === 17 ? 26 : 21;
    blocks(ctx,dark,[x,63,w,20]);
    blocks(ctx,'#759487',[x+2,65,w-4,15]);
    blocks(ctx,'#aac0a1',[x+3,66,4,7],[x+7,65,2,4]);
    blocks(ctx,'#475f52',[x+2,75,w-4,5]);
    blocks(ctx,'#dbad6c',[x+4,75,3,4],[x+12,76,4,3]);
    blocks(ctx,'#b57751',[x+8,74,3,5]);
    blocks(ctx,beam,[x+Math.floor(w/2),64,2,17]);
    blocks(ctx,trim,[x-1,82,w+2,2]);
  }
  blocks(ctx,wood,[50,59,20,28]);
  blocks(ctx,'#996e44',[53,61,14,25]);
  blocks(ctx,'#3c5148',[55,63,10,12]);
  blocks(ctx,'#93a797',[56,64,8,2],[56,66,2,7]);
  blocks(ctx,'#c19a64',[54,78,10,1],[65,76,2,2]);
  blocks(ctx,'#745339',[55,80,8,4]);
  blocks(ctx,'#d8b882',[50,86,20,2]);
  // Gabled red-tile roof. Tile ends are staggered at each course.
  shape(ctx,'#493e32',[[2,48],[20,14],[108,14],[127,42],[126,46],[105,54],[3,54]]);
  shape(ctx,'#a96248',[[4,48],[21,16],[107,16],[104,50],[4,50]]);
  for (let i = 0; i < 6; i++) {
    const y = 18+i*5, left = 21-i*3, right = 106-Math.floor(i*.4);
    blocks(ctx,'#824b3b',[left,y+3,right-left,1]);
    for (let x = left + (i%2)*5; x < right-2; x += 10) {
      blocks(ctx,'#96553d',[x,y,1,3]);
      blocks(ctx,i%2 ? '#bc7350' : '#c47a53',[x+1,y,Math.min(6,right-x-1),1]);
    }
  }
  shape(ctx,'#7d513d',[[108,16],[125,42],[105,48]]);
  shape(ctx,'#b49365',[[109,25],[119,41],[107,45]]);
  blocks(ctx,wood,[110,32,2,11],[114,39,3,2]);
  shape(ctx,'#754637',[[4,48],[103,48],[125,40],[125,44],[104,53],[3,53]]);
  blocks(ctx,'#da915f',[20,14,88,2],[4,48,100,2]);
  blocks(ctx,'#6c4837',[19,16,88,1],[6,52,98,2]);
  // Stone chimney and roof dormer.
  blocks(ctx,'#564a3e',[83,4,11,19],[81,2,15,5]);
  blocks(ctx,'#aa8e70',[85,7,7,14]);
  blocks(ctx,'#d2af86',[82,2,13,2],[85,8,6,2],[86,15,6,1]);
  blocks(ctx,'#7b6655',[88,10,2,3],[85,13,5,1]);
  shape(ctx,wood,[[29,32],[43,18],[56,32],[54,37],[30,38]]);
  shape(ctx,'#c6a273',[[31,32],[43,21],[53,32],[53,36],[31,36]]);
  blocks(ctx,dark,[38,27,9,9]);
  blocks(ctx,'#8ea392',[40,29,5,5]);
  blocks(ctx,wood,[42,29,1,5],[40,31,5,1]);
  shape(ctx,'#794d3a',[[27,31],[41,16],[45,16],[58,30],[55,32],[43,20],[29,34]]);
  // The light sign and striped shop awning read at the native resolution.
  blocks(ctx,'#4b4834',[30,47,52,11]);
  blocks(ctx,'#b19461',[31,47,50,1],[31,56,50,1]);
  const glyphs = ['10101/11111/10101/10101/10101','010/101/111/101/101','110/101/110/101/101','101/110/100/110/101','111/100/110/100/111','111/010/010/010/010'];
  let gx = 43;
  for (const letter of glyphs) {
    const rows = letter.split('/');
    stamp(ctx,rows,{'1':'#efd7a4'},gx,50);
    gx += rows[0].length+1;
  }
  blocks(ctx,wood,[12,57,87,2],[10,63,90,4]);
  for (let i = 0; i < 11; i++) {
    const x = 12+i*8;
    const base = i%2 ? '#647e61' : '#e0c89b';
    const face = i%2 ? '#486752' : '#b9a77e';
    shape(ctx,base,[[x+2,58],[x+10,58],[x+8,64],[x,64]]);
    blocks(ctx,face,[x,64,8,2],[x+1,66,6,1]);
  }
  // Bracket and little amber lamp on the right-hand wall.
  blocks(ctx,dark,[109,52,9,2],[116,53,1,4],[113,56,6,8]);
  blocks(ctx,'#e1ab60',[114,58,4,4]);
  blocks(ctx,'#ffe2a0',[115,58,2,3]);
}

function fence(ctx, count) {
  const w = count*12+3;
  blocks(ctx,'#56674960',[1,10,w-1,3]);
  blocks(ctx,'#715c40',[1,3,w-2,3],[1,8,w-2,2]);
  blocks(ctx,'#c19d68',[1,3,w-2,1],[1,8,w-2,1]);
  for (let x = 0; x < w; x += 12) {
    blocks(ctx,'#5b503b',[x,1,4,11],[x+1,0,2,1]);
    blocks(ctx,'#b29261',[x+1,1,2,10]);
    blocks(ctx,'#dbb782',[x+1,1,2,2]);
  }
}

function garden(ctx) {
  blocks(ctx,'#637d49',[0,2,49,23]);
  blocks(ctx,'#937653',[2,1,46,22]);
  for (let y = 5; y <= 18; y += 6) {
    blocks(ctx,'#695c40',[3,y,43,2],[4,y+2,41,1]);
    for (let x = 6; x < 46; x += 7) {
      blocks(ctx,'#536b3e',[x,y-1,4,3]);
      blocks(ctx,'#8ba05a',[x-1,y-2,2,2],[x+2,y-3,2,2]);
      blocks(ctx,'#c09960',[x+1,y+1,2,1]);
    }
  }
}

function crate(ctx) {
  shadow(ctx,0,12,15);
  blocks(ctx,'#594d38',[1,2,13,12],[3,0,10,2]);
  blocks(ctx,'#b28b56',[2,4,11,8],[3,1,9,2]);
  blocks(ctx,'#815f3d',[3,5,9,1],[3,9,9,1],[4,3,1,10],[10,3,1,10]);
  for (let i = 0; i < 8; i++) blocks(ctx,'#d2aa70',[3+i,10-i,2,2]);
  blocks(ctx,'#d1ad72',[2,3,11,1],[2,12,11,1]);
}

function barrel(ctx) {
  shadow(ctx,0,12,14);
  blocks(ctx,'#554a36',[2,2,10,12],[1,4,12,8]);
  blocks(ctx,'#9e784a',[3,2,8,11],[2,4,10,7]);
  blocks(ctx,'#c19a64',[4,1,6,2],[3,4,2,7]);
  blocks(ctx,'#566356',[2,4,10,2],[2,10,10,2]);
}

function notice(ctx) {
  shadow(ctx,0,20,23);
  blocks(ctx,'#544c37',[3,7,3,15],[17,7,3,15],[1,3,21,13]);
  blocks(ctx,'#b08d59',[3,4,17,10]);
  blocks(ctx,'#d0ad74',[2,2,19,2],[4,16,1,5],[18,16,1,5]);
  blocks(ctx,'#6f5740',[0,1,23,2],[2,0,19,1]);
  blocks(ctx,'#e2d1a3',[5,5,6,7],[13,6,5,5]);
  blocks(ctx,'#aa9470',[6,7,4,1],[6,9,3,1],[14,8,2,1]);
}

function sign(ctx) {
  shadow(ctx,2,13,13);
  blocks(ctx,'#64573e',[7,4,3,11],[1,1,13,5],[3,6,10,3]);
  blocks(ctx,'#d0ac74',[2,1,11,2],[4,6,9,1]);
  blocks(ctx,'#aa8556',[2,3,12,2],[3,7,9,1],[8,9,1,5]);
  blocks(ctx,'#7c6647',[14,2,2,2],[1,7,2,1]);
}

function stones(ctx, variant) {
  shadow(ctx,1,9,18);
  shape(ctx,'#596557',[[1,8],[5,3],[10,2],[14,6],[14,10],[2,11]],1);
  shape(ctx,'#89927c',[[2,8],[5,4],[10,3],[12,6],[8,8]],1);
  blocks(ctx,'#b1b097',[5,4,4,1],[3,7,2,1]);
  blocks(ctx,'#717d6a',[13,8,4,2],[15,7,2,1],[1+variant,10,2,1]);
}

function bush(ctx, variant) {
  shadow(ctx,0,11,22);
  crown(ctx,2,1,15,12,'#486241');
  crown(ctx,9,5,13,8,'#486241');
  crown(ctx,3,2,12,8,'#6d8a4d');
  crown(ctx,11,5,9,5,'#78914f');
  blocks(ctx,'#9da95d',[5,4,3,1],[12,6,3,1]);
  blocks(ctx,variant ? '#ac774d':'#c19356',[7,7,2,2],[15,8,2,1],[10,5,1,2]);
}

function reeds(ctx) {
  for (const [x,h] of [[3,5],[6,9],[9,6],[11,8]]) {
    blocks(ctx,'#576f49',[x,12-h,1,h],[x-2,10,2,1]);
    blocks(ctx,'#785e41',[x,9-h,2,4]);
    blocks(ctx,'#c09c63',[x,9-h,1,2]);
  }
}

function flowers(ctx, variant) {
  const centers = [[3,6],[8,3],[12,7],[17,4]];
  for (const [x,y] of centers) {
    blocks(ctx,'#657e49',[x,y+1,1,4],[x+1,y+2,2,1]);
    blocks(ctx,variant === 1 ? '#e2b879':'#e6dba7',[x-1,y,3,1],[x,y-1,1,3]);
    blocks(ctx,'#c89956',[x,y,1,1]);
  }
}

// Footprints are [offset from feet x, offset from feet y, width, height] in map pixels.
export const scenery = {
  pine: {size:[44,52], draw:pine, body:[-5,-7,10,7]},
  oak: {size:[44,45], draw:oak, body:[-5,-7,10,7]},
  shop: {size:[128,98], draw:shop, body:[-54,-49,112,45]},
  fence: {size:[0,15], draw:fence},
  garden: {size:[50,25], draw:garden},
  crate: {size:[16,16], draw:crate, body:[-6,-9,12,8]},
  barrel: {size:[15,16], draw:barrel, body:[-5,-8,10,7]},
  board: {size:[24,24], draw:notice, body:[-9,-6,18,5]},
  sign: {size:[17,17], draw:sign, body:[-2,-5,4,4]},
  stones: {size:[19,13], draw:stones, body:[-5,-5,10,4]},
  bush: {size:[23,15], draw:bush, body:[-6,-5,12,4]},
  reeds: {size:[15,13], draw:reeds},
  flowers: {size:[20,13], draw:flowers}
};

export function propTexture(kind, variant) {
  const definition = scenery[kind];
  const [width,height] = definition.size;
  const ctx = surface(kind === 'fence' ? variant*12+4 : width, height);
  definition.draw(ctx,variant);
  return ctx.canvas;
}
