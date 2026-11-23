const assert = require('node:assert/strict');

// Inspect the final Canvas draws. Physics positions alone miss rounding before zoom.
function trackCanvasMotion() {
  const game = window.testGame, scene = game.scene.getScene('town');
  const context = game.canvas.getContext('2d'), draw = context.drawImage;
  const ground = scene.textures.get('ground').getSourceImage();
  const hero = scene.textures.get('hero').getSourceImage();
  let groundOrigin, feet, time = performance.now();
  context.drawImage = function (image, ...args) {
    if (image === ground || image === hero) {
      const {e, f} = this.getTransform();
      if (image === ground) groundOrigin = [e, f];
      else feet = [e, f];
    }
    return draw.call(this, image, ...args);
  };
  window.sampleDiagonal = (count, hz) => {
    const frames = [];
    for (let i = 0; i < count; i++) {
      game.step(time += 1000 / hz, 1000 / hz);
      frames.push({ground:groundOrigin, feet, facing:scene.facing});
    }
    return frames;
  };
  return game.canvas.width / game.canvas.getBoundingClientRect().width;
}

function checkRasterSteps(values, direction, hz, label) {
  let still = 0;
  for (let i = 1; i < values.length; i++) {
    const step = values[i] - values[i-1];
    assert(step === 0 || step === direction, label + ' unexpected canvas step: ' + step);
    still = step === 0 ? still + 1 : 0;
    assert(still <= hz / 20, label + ' held a pixel for ' + still + ' frames at ' + hz + ' Hz');
  }
}

async function checkSlowDiagonal(page, reset) {
  const cdp = await page.context().newCDPSession(page);
  const touch = (type, point) => cdp.send('Input.dispatchTouchEvent', {type, touchPoints:point ? [point] : []});
  for (const [width, height] of [[390,844], [844,390]]) {
    await page.setViewportSize({width, height});
    for (const hz of [60, 120]) {
      await reset();
      assert(Math.abs(await page.evaluate(trackCanvasMotion) - 2) < .01);
      const pad = await page.locator('#joystick').boundingBox();
      const x = pad.x + pad.width / 2, y = pad.y + pad.height / 2;
      const panAxis = width < height ? 0 : 1;
      // Move away from the nearest camera bound in each viewport.
      const sign = width < height ? -1 : 1;
      const radius = sign * pad.width * .33 * .26;
      const aim = degrees => {
        const angle = degrees * Math.PI / 180;
        return touch('touchMove', {x:x + radius * Math.cos(angle), y:y + radius * Math.sin(angle)});
      };
      await touch('touchStart', {x, y});
      await aim(45);
      const cruise = await page.evaluate(hz => {
        window.sampleDiagonal(hz, hz); // Let the stick and camera reach cruising speed.
        return window.sampleDiagonal(hz, hz);
      }, hz);
      checkRasterSteps(cruise.map(f => f.ground[panAxis]), -sign, hz, width + 'px ground');
      checkRasterSteps(cruise.map(f => f.feet[1-panAxis]), sign, hz, width + 'px feet');
      const tracked = cruise.map(f => f.feet[panAxis]);
      assert(Math.max(...tracked) - Math.min(...tracked) <= 1, 'wobble on the camera-follow axis');

      // A finger straddling 45 degrees keeps its pose. A deliberate turn changes it.
      const original = cruise.at(-1).facing;
      for (const angle of [42, 48, 42, 48]) {
        await aim(angle);
        const poses = await page.evaluate(hz => window.sampleDiagonal(hz / 5, hz).map(f => f.facing), hz);
        assert(poses.every(pose => pose === original), 'facing flickered near a diagonal');
      }
      await aim(20);
      const turned = await page.evaluate(hz => window.sampleDiagonal(hz / 5, hz).at(-1).facing, hz);
      assert.equal(turned, sign > 0 ? 'right' : 'left');
      await touch('touchEnd');
    }
  }
  await cdp.detach();
  console.log('Slow diagonal touch at 60/120 Hz: single-pixel canvas motion and stable facing in both orientations passed');
}

module.exports = {checkSlowDiagonal};
