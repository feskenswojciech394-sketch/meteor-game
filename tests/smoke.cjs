const assert = require('node:assert/strict');
const { mkdir } = require('node:fs/promises');
const { join } = require('node:path');
const { chromium } = require('playwright-core');

const url = process.argv[2];
const shots = process.env.METEOR_QA_SHOTS;

async function ready(page) {
  await page.goto(url);
  await page.waitForSelector('#loading', {state:'hidden', timeout:20000});
  await page.waitForSelector('#game canvas');
  await page.evaluate(() => document.fonts.ready.then(() => true));
}

async function snapshot(page, name) {
  if (shots) await page.screenshot({path:join(shots,name+'.png')});
}

// A tiny fixture isolates control/collision checks from edits to the shipped maps and story.
async function enterFixture(page) {
  const map = {
    name:'测试街道', chapter:'测试', day:'', time:'上午', tileSize:16, seed:1,
    tiles:Array.from({length:18},(_,y) => (y === 6 ? '#' : '.').repeat(32)),
    spawn:[140,150], npcs:[{id:'test',name:'镇民',at:[125,116],dialogue:'hello'}],
    props:[], areas:[], defaultArea:'街道', objective:{npc:'test',text:'交谈',done:'探索'}
  };
  const data = {
    'assets/world.json': {startMap:'street', maps:{street:'./assets/check-map.json'}, dialogues:'./assets/check-lines.json'},
    'assets/check-map.json': map,
    'assets/check-lines.json': {hello:['你好。','回见。']}
  };
  for (const [path,json] of Object.entries(data)) {
    await page.route(new URL(path,url).href, route => route.fulfill({json}));
  }
  await ready(page);
}

async function checkLayout(page) {
  await page.waitForFunction(() => {
    const frame = document.querySelector('#game').getBoundingClientRect();
    const canvas = document.querySelector('#game canvas').getBoundingClientRect();
    return frame.width > 100 && Math.abs(frame.width-canvas.width) < 2 && Math.abs(frame.height-canvas.height) < 2;
  });
  for (const id of ['#game','#interact','#joystick']) {
    const rect = await page.locator(id).boundingBox();
    const {width,height} = page.viewportSize();
    assert(rect.width > 0 && rect.height > 0 && rect.x >= 0 && rect.y >= 0);
    assert(rect.x + rect.width <= width+1 && rect.y + rect.height <= height+1, id+' outside viewport');
  }
}

async function run() {
  if (shots) await mkdir(shots,{recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROME_BIN, headless:true});
  const errors = [];
  const observe = page => page.on('pageerror',error => { errors.push(error.message); console.error(error); });
  try {
    const desktop = await browser.newContext({viewport:{width:1280,height:800}});
    const page = await desktop.newPage();
    observe(page);
    await ready(page);
    await snapshot(page,'desktop');
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
      }
    });
    await desktop.setOffline(true);
    await ready(page);
    console.log('Cold offline navigation of the actual game under the project path passed');
    await desktop.close();

    const keyboard = await browser.newContext({serviceWorkers:'block'});
    const walk = await keyboard.newPage();
    observe(walk);
    await enterFixture(walk);
    assert(await walk.locator('#interact').isDisabled());
    await walk.keyboard.down('ArrowUp');
    await walk.waitForSelector('#interact:enabled');
    // Holding up must leave the player beside the NPC, stopped by the stone wall.
    await walk.waitForTimeout(1200);
    await walk.keyboard.up('ArrowUp');
    assert(await walk.locator('#interact').isEnabled(),'walked through the wall');
    await walk.keyboard.press('e');
    await walk.waitForSelector('#conversation[open]');
    assert.equal(await walk.locator('#speaker').textContent(),'镇民');
    await walk.locator('#next').click();
    await walk.locator('#next').click();
    assert.equal(await walk.locator('#objective-text').textContent(),'探索');
    await walk.keyboard.down('ArrowDown');
    await walk.waitForSelector('#interact:disabled');
    await walk.keyboard.up('ArrowDown');
    await walk.keyboard.press('Escape');
    await walk.waitForSelector('#paused[open]');
    await walk.locator('#resume').click();
    console.log('Keyboard movement, wall collision, range, dialogue and pause passed');
    await keyboard.close();

    const mobile = await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1, serviceWorkers:'block'});
    const phone = await mobile.newPage();
    observe(phone);
    await ready(phone);
    await checkLayout(phone);
    await snapshot(phone,'portrait');
    await phone.setViewportSize({width:844,height:390});
    await checkLayout(phone);
    await snapshot(phone,'landscape');
    await phone.setViewportSize({width:390,height:844});
    await enterFixture(phone);
    await checkLayout(phone);
    const cdp = await mobile.newCDPSession(phone);
    const pad = await phone.locator('#joystick').boundingBox();
    const x = pad.x+pad.width/2, y = pad.y+pad.height/2;
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:y-pad.height*.35}]});
    await phone.waitForSelector('#interact:enabled');
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await phone.locator('#interact').tap();
    await phone.waitForSelector('#conversation[open]');
    await phone.locator('#close-talk').tap();
    await phone.setViewportSize({width:844,height:390});
    await checkLayout(phone);
    await phone.locator('#interact').tap();
    await phone.waitForSelector('#conversation[open]');
    assert.deepEqual(errors,[]);
    console.log('Touch joystick, portrait, landscape rotation and tap-to-talk passed');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
