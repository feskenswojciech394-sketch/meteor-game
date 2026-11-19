import { drawIcons } from './art/icons.js';
import { drawPortrait } from './art/actors.js';
import { GameUI } from './controls.js';

async function readJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('无法读取 ' + path + ' (' + response.status + ')');
  return response.json();
}

function bindFullscreen() {
  const button = document.getElementById('fullscreen');
  const root = document.documentElement;
  const update = () => {
    const active = Boolean(document.fullscreenElement || document.body.classList.contains('immersive'));
    button.setAttribute('aria-pressed', String(active));
    button.title = active ? '退出全屏' : '全屏';
    button.setAttribute('aria-label', button.title);
  };
  button.addEventListener('click', async () => {
    try {
      if (document.body.classList.contains('immersive')) document.body.classList.remove('immersive');
      else if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.requestFullscreen && document.fullscreenEnabled) await root.requestFullscreen();
      else document.body.classList.toggle('immersive');
    } catch {
      document.body.classList.toggle('immersive');
    }
    update();
  });
  document.addEventListener('fullscreenchange',update);
}

async function enterTown() {
  drawIcons();
  drawPortrait(document.getElementById('portrait'));
  bindFullscreen();
  // The module and classic Phaser script can finish downloading in either order.
  if (document.readyState !== 'complete' && !window.Phaser) {
    await new Promise(resolve => window.addEventListener('load',resolve,{once:true}));
  }
  if (!window.Phaser) throw new Error('Phaser 加载失败');
  const world = await readJSON('./assets/world.json');
  const selected = new URLSearchParams(location.search).get('map') ?? world.startMap;
  if (!Object.hasOwn(world.maps, selected)) throw new Error('找不到地图 ' + selected);
  const [map,dialogues,{TownScene}] = await Promise.all([
    readJSON(world.maps[selected]), readJSON(world.dialogues), import('./scenes/TownScene.js')
  ]);
  for (const person of map.npcs) {
    if (!Array.isArray(dialogues[person.dialogue]) || !dialogues[person.dialogue].length) {
      throw new Error('缺少' + person.name + '的对白');
    }
  }
  const ui = new GameUI(map,dialogues);
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: 'game',
    banner: false,
    backgroundColor: '#829e5a',
    pixelArt: true,
    roundPixels: true,
    audio: { noAudio:true },
    scale: { mode:Phaser.Scale.RESIZE, width:'100%', height:'100%' },
    input: { keyboard:false, mouse:false, touch:false },
    physics: { default:'arcade', arcade:{ gravity:{x:0,y:0} } },
    scene: [new TownScene(map,ui)]
  });
  const observer = new ResizeObserver(() => { if (game.isBooted) game.scale.refresh(); });
  observer.observe(document.getElementById('game'));
  game.events.once('destroy',() => observer.disconnect());
}

document.getElementById('retry').addEventListener('click',() => location.reload());
enterTown().catch(error => {
  const panel = document.getElementById('loading');
  panel.hidden = false;
  document.getElementById('loading-text').textContent = '小镇加载失败。' + error.message;
  document.getElementById('retry').hidden = false;
});
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load',() => {
    navigator.serviceWorker.register('./sw.js').catch(error => console.warn('离线缓存暂不可用',error));
  });
}
