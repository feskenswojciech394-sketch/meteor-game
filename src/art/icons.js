import { blocks, stamp } from './pixels.js';

export const meteorPattern = [
  "..............aa",
  "...........aa.a.",
  ".........aaa.a..",
  "........aaa.a.a.",
  "......aaaa.aaa..",
  ".....aaaa.aaa.a.",
  "...aaaaaa.aaaa..",
  "..aabbbbaaaaa...",
  ".aabbccbbba.....",
  ".abbccccbbaa....",
  "abbcccccbba.....",
  "abbcccccbba.....",
  ".abccccbba......",
  ".aabbbbbaa......",
  "..aaaabba.......",
  "....aaa........."
];
const colors = { a: '#dc8950', b: '#f2bc68', c: '#ffe2a0' };
const letters = {
  M: ['11011','11111','11111','10101','10101','10001','10001'],
  E: ['11111','11111','11000','11110','11000','11111','11111'],
  T: ['11111','11111','00100','00100','00100','00100','00100'],
  O: ['01110','11111','11011','11011','11011','11111','01110'],
  R: ['11110','11111','11011','11110','11100','11010','11011']
};

const drawings = {
  pause(ctx) { blocks(ctx, '#e2e5d5', [3,2,4,12], [10,2,4,12]); },
  expand(ctx) { blocks(ctx, '#dce0cf', [2,2,5,2], [2,4,2,3], [9,2,5,2], [12,4,2,3], [2,9,2,5], [4,12,3,2], [12,9,2,5], [9,12,3,2]); },
  close(ctx) {
    for (let i = 0; i < 8; i++) blocks(ctx, '#dce0cf', [3+i,3+i,2,2], [10-i,3+i,2,2]);
  },
  sun(ctx) {
    blocks(ctx, '#e8b661', [7,0,2,3], [7,13,2,3], [0,7,3,2], [13,7,3,2], [2,2,2,2], [12,12,2,2], [2,12,2,2], [12,2,2,2], [6,4,4,8], [4,6,8,4]);
    blocks(ctx, '#ffdc88', [6,5,4,2], [5,7,2,2]);
  },
  flag(ctx) {
    blocks(ctx, '#e5b46d', [3,2,2,12], [5,2,8,2], [5,4,6,3], [5,7,8,1], [1,14,6,1]);
    blocks(ctx, '#ffe3a5', [3,1,2,2], [5,3,6,1]);
  },
  chat(ctx) {
    blocks(ctx, '#303825', [1,3,14,8], [3,2,10,1], [3,11,10,1], [4,12,2,2], [6,12,1,1]);
    blocks(ctx, '#c5a56a', [4,6,2,2], [7,6,2,2], [10,6,2,2]);
  },
  compass(ctx) {
    const rows = ['....xx....','....ax....','...aabx...','...aabx...','..aaabbx..','..aaabbx..','.aaaabbbx.','.aaaxbbbx.','..xx.xbx..','.....xx...','......x...'];
    stamp(ctx, rows, {x:'#344538', a:'#ffe6ac', b:'#a99a78'});
  }
};

export function drawIcons() {
  for (const canvas of document.querySelectorAll('canvas[data-icon]')) {
    const name = canvas.dataset.icon;
    canvas.width = name === 'wordmark' ? 35 : name === 'compass' ? 10 : 16;
    canvas.height = name === 'wordmark' ? 7 : name === 'compass' ? 11 : 16;
    const ctx = canvas.getContext('2d');
    if (name === 'meteor') stamp(ctx, meteorPattern, colors);
    else if (name === 'wordmark') {
      [...'METEOR'].forEach((letter, i) => stamp(ctx, letters[letter], {'1':'#f3efdd'}, i * 6));
    } else drawings[name](ctx);
  }
}
