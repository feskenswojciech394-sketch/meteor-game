import { blocks, randomStream, surface } from './pixels.js';

const palette = {
  grass: [[123,153,85], [130,158,90], [137,163,96]],
  dirt: [[202,175,124], [207,181,131]],
  verge: [163,157,97], sand: [187,166,114],
  bank: [108,127,82], bankLight: [168,176,116],
  water: [76,143,140], waterEdge: [112,166,148], shallows: [91,154,142]
};

function wall(ctx, x, y, size, rng, hasLeft, hasRight) {
  blocks(ctx, '#687c50', [x+1,y+7,size,9]);
  blocks(ctx, '#485749', [x,y+2,size,12]);
  for (let row = 0; row < 2; row++) {
    const breakAt = row === 0 ? 6 : 10;
    let left = 0;
    for (const width of [breakAt, size-breakAt]) {
      const by = y + row * 5 + 3;
      const color = rng() < .5 ? '#92977c' : '#878e75';
      blocks(ctx, color, [x+left+1,by,width-1,4]);
      blocks(ctx, '#b0ad8c', [x+left+1,by,width-2,1]);
      blocks(ctx, '#707c68', [x+left+width-2,by+2,2,2]);
      left += width;
    }
  }
  blocks(ctx, '#abb093', [x,y+1,size,2]);
  blocks(ctx, '#667c56', [x+4,y,4,2], [x+5,y+2,2,2]);
  if (!hasLeft) blocks(ctx, '#536352', [x,y+2,1,11]);
  if (!hasRight) blocks(ctx, '#536352', [x+size-1,y+2,1,11]);
}

export function terrainTexture(map) {
  const { tiles, tileSize: size } = map;
  const width = tiles[0].length * size;
  const height = tiles.length * size;
  const ctx = surface(width, height);
  const image = ctx.createImageData(width, height);
  const rng = randomStream(map.seed);
  const cell = (x, y) => tiles[Math.max(0,Math.min(tiles.length-1,y))][Math.max(0,Math.min(tiles[0].length-1,x))];

  // Interpolate neighbouring cells to soften shore and path corners on the tile grid.
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const gx = (x + 1.6 * Math.sin(y * .15)) / size - .5;
      const gy = (y + 1.3 * Math.sin(x * .13) + Math.sin(x * .61)) / size - .5;
      const col = Math.floor(gx), row = Math.floor(gy);
      const fx = gx-col, fy = gy-row;
      const a = cell(col,row), b = cell(col+1,row), c = cell(col,row+1), d = cell(col+1,row+1);
      const cover = key => (a === key)*(1-fx)*(1-fy) + (b === key)*fx*(1-fy) + (c === key)*(1-fx)*fy + (d === key)*fx*fy;
      const path = cover('='), water = cover('~');
      const patch = Math.sin(x*.055 + y*.043) + Math.cos(y*.071 - x*.032) + .4*Math.sin((x+y)*.12);
      let rgb = palette.grass[patch < -.9 ? 0 : patch > 1.15 ? 2 : 1];
      if (path > .40) rgb = path < .46 ? palette.verge : path < .54 ? palette.sand : palette.dirt[patch > .45 ? 1 : 0];
      if (water > .34) rgb = water < .42 ? palette.bankLight : water < .53 ? palette.bank : water < .61 ? palette.waterEdge : water < .78 ? palette.shallows : palette.water;
      const i = (y*width+x)*4;
      image.data[i] = rgb[0]; image.data[i+1] = rgb[1]; image.data[i+2] = rgb[2]; image.data[i+3] = 255;
    }
  }
  ctx.putImageData(image,0,0);

  for (let i = 0; i < width*height/91; i++) {
    const x = Math.floor(rng()*width), y = Math.floor(rng()*height);
    const tile = cell(Math.floor(x/size),Math.floor(y/size));
    const pick = rng();
    if (tile === '.') {
      if (pick < .38) {
        blocks(ctx, '#738d50', [x,y,1,2], [x+1,y+1,3,1], [x+4,y-1,1,2]);
        if (pick < .18) blocks(ctx, '#a2b273', [x+2,y-1,1,2]);
      } else if (pick < .69) blocks(ctx, '#91aa67', [x,y,3,1], [x+2,y-1,2,1]);
      else blocks(ctx, '#829957', [x,y,2,1]);
    } else if (tile === '=') {
      if (pick < .15) {
        blocks(ctx, '#aa986e', [x,y,4,2], [x+1,y-1,2,1]);
        blocks(ctx, '#ddc599', [x,y,3,1]);
      } else blocks(ctx, pick < .48 ? '#dbc092' : '#bda573', [x,y,pick < .4 ? 3 : 2,1]);
    } else if (tile === '~' && pick < .5) {
      blocks(ctx, pick < .2 ? '#8cb8a2' : '#66a39a', [x,y,3+Math.floor(rng()*7),1]);
    }
  }

  tiles.forEach((row, ty) => [...row].forEach((key, tx) => {
    if (key === '#') wall(ctx, tx*size, ty*size, size, rng, row[tx-1] === '#', row[tx+1] === '#');
  }));
  return ctx.canvas;
}
