// All art is drawn on a small integer grid and enlarged with nearest-neighbour sampling.
export function surface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return ctx;
}

export function blocks(ctx, color, ...rectangles) {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of rectangles) ctx.fillRect(x, y, w, h);
}

// Rasterize a silhouette as horizontal runs of solid pixels.
export function shape(ctx, color, points, step = 1) {
  const ys = points.map(point => point[1]);
  const top = Math.min(...ys);
  const bottom = Math.max(...ys);
  ctx.fillStyle = color;
  for (let y = top; y < bottom; y += step) {
    const crossings = [];
    const scan = y + 0.5;
    for (let i = 0; i < points.length; i++) {
      const [ax, ay] = points[i];
      const [bx, by] = points[(i + 1) % points.length];
      if ((ay <= scan && by > scan) || (by <= scan && ay > scan)) {
        crossings.push(ax + (scan - ay) * (bx - ax) / (by - ay));
      }
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const left = Math.round(crossings[i]);
      ctx.fillRect(left, y, Math.round(crossings[i + 1]) - left, Math.min(step, bottom - y));
    }
  }
}

export function stamp(ctx, rows, colors, x = 0, y = 0) {
  rows.forEach((row, dy) => {
    [...row].forEach((key, dx) => {
      if (colors[key]) {
        ctx.fillStyle = colors[key];
        ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    });
  });
}

export function randomStream(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
