// Drive actual Phaser game frames with a controlled clock. The capture is test-only.
const assert = require('node:assert/strict');
const {checkSlowDiagonal} = require('./diagonal.cjs');

function captureGame() {
  Object.defineProperty(window, 'Phaser', {
    configurable: true,
    set(phaser) {
      Object.defineProperty(window, 'Phaser', {value: phaser, configurable: true, writable: true});
      const Game = phaser.Game;
      phaser.Game = class extends Game {
        constructor(config) {
          super(config);
          window.testGame = this;
          phaser.Game = Game;
        }
      };
    }
  });
}

async function checkMovement(browser, url, enterFixture) {
  const context = await browser.newContext({viewport:{width:420,height:820},
    deviceScaleFactor:2, hasTouch:true, isMobile:true, serviceWorkers:'block'});
  try {
    const page = await context.newPage();
    await page.addInitScript(captureGame);
    // A different local sheet and a four-frame sequence exercise the configuration-only path.
    await page.route(new URL('assets/player.json', url).href, route => route.fulfill({json:{
      image:'./assets/icons/meteor-192.png', frameWidth:32, frameHeight:32, stridePixels:20.8,
      directions:{down:{idle:0,walk:[1,2]}, left:{idle:3,walk:[4]}, up:{idle:9,walk:[10,11]},
        right:{idle:18,walk:[19,20,21,22]}}
    }}));
    await enterFixture(page);
    const reset = async () => {
      await page.reload();
      await page.waitForSelector('#loading', {state:'hidden'});
      await page.evaluate(() => window.testGame.loop.sleep());
    };

    for (const hz of [30, 60, 120, 144]) {
      await reset();
      const result = await page.evaluate(hz => {
        const game = window.testGame, scene = game.scene.getScene('town');
        const body = scene.body, startX = body.center.x;
        const camera = scene.cameras.main;
        let time = performance.now(), ticks = 0;
        const delta = 1000 / hz;
        scene.physics.world.on('worldstep', () => ticks++);
        const frame = () => game.step(time += delta, delta);
        const key = (type, code) => window.dispatchEvent(new KeyboardEvent(type, {code}));
        key('keydown', 'ArrowRight');
        const poses = new Set(), cruisingX = [];
        let aligned = true, gaitMatchesDistance = true;
        const gait = scene.playerArt.directions.right;
        for (let i = 0; i < hz; i++) {
          frame();
          const traveled = body.center.x - startX;
          const stride = scene.playerArt.stridePixels;
          const expected = gait.walk[Math.floor((traveled % stride) / stride * gait.walk.length)];
          if (traveled > 0) {
            poses.add(scene.player.frame.name);
            gaitMatchesDistance &&= scene.player.frame.name === expected;
          }
          aligned &&= Number.isInteger(scene.player.x) && Number.isInteger(scene.player.y);
          if (i >= hz * .8) cruisingX.push(scene.player.x - camera.scrollX);
        }
        const x = body.center.x, y = body.bottom;
        const scale = scene.player.scaleX;
        const lag = (camera.getScroll(x * scale, (y - scene.lookAhead) * scale).x - camera.scrollX) / scale;
        key('keydown', 'ArrowDown');
        for (let i = 0; i < hz; i++) frame();
        const dx = body.center.x - x, dy = body.bottom - y;
        key('keyup', 'ArrowDown');
        key('keyup', 'ArrowRight');
        frame();
        return {ticks, distance:x-startX, dx, dy, aligned, lag, poses:[...poses],
          gaitMatchesDistance, idle:scene.player.frame.name, frameWidth:scene.player.width,
          cameraWobble:Math.max(...cruisingX)-Math.min(...cruisingX)};
      }, hz);
      const near = (value, expected) => assert(Math.abs(value-expected) < 1e-6, hz+' Hz: '+value+' vs '+expected);
      near(result.distance, 67);
      near(result.dx, 67/Math.SQRT2);
      near(result.dy, 67/Math.SQRT2);
      assert(result.ticks >= 120 && result.ticks <= 122, 'unexpected physics step count');
      assert(result.aligned && result.gaitMatchesDistance);
      assert(result.lag > 5 && result.lag < 15 && result.cameraWobble <= 1, JSON.stringify(result));
      assert.deepEqual(result.poses, [19,20,21,22]);
      assert.equal(result.frameWidth, 32);
      assert.equal(result.idle, 0);
    }
    console.log('30/60/120/144 Hz: 67 px straight and diagonal in 1s, pixel-aligned follow and four configured walk frames passed');

    // Use a real captured pointer with the game clock stopped between browser events.
    await reset();
    const pad = await page.locator('#joystick').boundingBox();
    const x = pad.x + pad.width/2, y = pad.y + pad.height/2;
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x + pad.width*.33*.56, y);
    const sample = await page.evaluate(() => {
      const game = window.testGame, scene = game.scene.getScene('town');
      const start = scene.body.center.x, speeds = [];
      let time = performance.now();
      const gait = scene.playerArt.directions.right, stride = scene.playerArt.stridePixels;
      let matches = true;
      for (let i=0; i<60; i++) {
        game.step(time += 1000/60, 1000/60);
        speeds.push(scene.body.velocity.x);
        const phase = ((scene.body.center.x-start) % stride) / stride;
        matches &&= scene.player.frame.name === gait.walk[Math.floor(phase * gait.walk.length)];
      }
      return {first:speeds[0], last:speeds.at(-1), increasing:speeds.every((v,i) => !i || v >= speeds[i-1]), matches};
    });
    assert(sample.first > 0 && sample.first < sample.last*.6 && sample.increasing);
    assert(Math.abs(sample.last - 33.5) < 3 && sample.matches);
    await page.mouse.up();
    const stop = await page.evaluate(() => {
      const game = window.testGame, scene = game.scene.getScene('town');
      const x = scene.body.center.x, speed = scene.body.velocity.length(), idle = scene.player.frame.name;
      const drawnX = new Set();
      for (let i=1; i<=30; i++) {
        game.step(i*1000/60, 1000/60);
        drawnX.add(scene.player.x);
      }
      return {speed, idle, drift:scene.body.center.x-x, restingPixels:drawnX.size};
    });
    assert.deepEqual(stop, {speed:0, idle:18, drift:0, restingPixels:1});
    console.log('Analog ramp, distance-based gait at half speed, immediate release and zero drift passed');
    await checkSlowDiagonal(page, reset);
  } finally {
    await context.close();
  }
}

module.exports = {checkMovement};
