// Авто ПУ — кеш оболонки застосунку. Дані з сервера не кешуються тут (вони в localStorage на пристрої).
const C = 'apu-v25';
const SHELL = ['./', 'index.html', 'style.css?v=25', 'fonts/inter-cyrillic-wght-normal.woff2', 'fonts/inter-latin-wght-normal.woff2', 'fonts/cormorant-garamond-cyrillic-600-normal.woff2', 'fonts/cormorant-garamond-cyrillic-500-normal.woff2', 'car3d.js?v=9', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
