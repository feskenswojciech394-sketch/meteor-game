// Run against the staged site so relative URLs and the release service worker are exercised.
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
}

async function snapshot(page, name) {
  if (shots) await page.screenshot({path:join(shots,name+'.png')});
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
  try {
    const desktop = await browser.newContext({viewport:{width:1280,height:800}});
    const page = await desktop.newPage();
    page.on('pageerror',error => errors.push(error.message));
    await ready(page);
    assert(await page.locator('#interact').isDisabled());
    await snapshot(page,'desktop');

    // Holding up reaches the shop's wall. The player must stay at the shopkeeper's side.
    await page.keyboard.down('ArrowUp');
    await page.waitForSelector('#interact:enabled');
    await page.waitForTimeout(1200);
    await page.keyboard.up('ArrowUp');
    assert(await page.locator('#interact').isEnabled(), 'walked through the shop wall');
    await page.keyboard.press('e');
    await page.waitForSelector('#conversation[open]');
    assert.equal(await page.locator('#speaker').textContent(),'店主');
    await page.locator('#next').click();
    await page.locator('#next').click();
    await page.locator('#next').click();
    assert.equal(await page.locator('#objective-label').textContent(),'自由探索');
    await page.keyboard.down('ArrowDown');
    await page.waitForSelector('#interact:disabled');
    await page.keyboard.up('ArrowDown');
    await page.keyboard.press('Escape');
    await page.waitForSelector('#paused[open]');
    await page.locator('#resume').click();
    console.log('Desktop movement, collision, range, dialogue and pause passed');

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange',resolve,{once:true}));
      }
    });
    await desktop.setOffline(true);
    await ready(page);
    assert(await page.locator('#interact').isDisabled());
    console.log('Cold offline navigation under the project path passed');
    await desktop.close();

    const mobile = await browser.newContext({viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:1});
    const phone = await mobile.newPage();
    phone.on('pageerror',error => errors.push(error.message));
    await ready(phone);
    await checkLayout(phone);
    await snapshot(phone,'portrait');
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
    await snapshot(phone,'landscape');
    await phone.locator('#interact').tap();
    await phone.waitForSelector('#conversation[open]');
    assert.deepEqual(errors,[]);
    console.log('Touch joystick, portrait, landscape rotation and tap-to-talk passed');
  } finally {
    await browser.close();
  }
}

run().catch(error => { console.error(error); process.exitCode = 1; });
