const BUILD = 'development';
const PREFIX = 'meteor-town:' + self.registration.scope + ':';
const CACHE = PREFIX + BUILD;
const ENTRY = new URL('./index.html', self.registration.scope).href;
const CORE = [
  './index.html', './manifest.json', './src/style.css', './src/main.js',
  './src/controls.js', './src/scenes/TownScene.js', './src/art/pixels.js',
  './src/art/terrain.js', './src/art/scenery.js', './src/art/actors.js', './src/art/icons.js',
  './assets/vendor/phaser-arcade-physics-3.90.0.min.js',
  './assets/icons/meteor-192.png', './assets/icons/meteor-512.png', './assets/world.json'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    const fresh = path => new Request(new URL(path,self.registration.scope), {cache:'reload'});
    await cache.addAll(CORE.map(fresh));
    const registry = await (await cache.match(fresh('./assets/world.json'))).json();
    await cache.addAll([...new Set([registry.dialogues,...Object.values(registry.maps)])].map(fresh));
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const {request} = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = request.mode === 'navigate' ? ENTRY : request;
    const saved = await cache.match(key);
    if (saved && BUILD !== 'development') return saved;
    try {
      const response = await fetch(request);
      if (saved && response.ok && BUILD === 'development') await cache.put(key,response.clone());
      return response;
    } catch (error) {
      if (saved) return saved;
      throw error;
    }
  })());
});
