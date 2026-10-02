// En desarrollo se registra como /sw.js?dev=1: todo va primero a la red para no servir código
// viejo de Turbopack, pero igual se guardan copias para poder probar el modo sin conexión.
const DEV = new URL(self.location.href).searchParams.has("dev");

const CACHE_NAME = "life-os-v3";
// Última versión de cada pantalla (HTML), para poder verla sin señal. Tiene datos personales:
// se borra al cerrar sesión (mensaje "clear-pages" desde la app).
const PAGES_CACHE = "life-os-pages-v1";
// Fotos de ejercicios (CDN externo, fijadas a un commit: nunca cambian) para verlas en el gimnasio sin señal.
const IMAGE_CACHE = "life-os-img-v1";
const IMAGE_HOST = "cdn.jsdelivr.net";
const OFFLINE_URL = "/offline";
const NO_CACHE_PAGES = ["/login", "/offline", "/api/"];

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keep = [CACHE_NAME, PAGES_CACHE, IMAGE_CACHE];
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => !keep.includes(key)).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data === "clear-pages") event.waitUntil(caches.delete(PAGES_CACHE));
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  if (url.hostname === IMAGE_HOST && request.destination === "image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, true));
    return;
  }

  if (url.origin !== self.location.origin) return;
  // Respaldo y otras rutas de API: siempre a la red, nunca desde caché.
  if (url.pathname.startsWith("/api/")) return;

  // Pantallas: red primero; sin señal, la última copia de esa pantalla o la página offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const cacheable =
            response.ok && !response.redirected && !NO_CACHE_PAGES.some((path) => url.pathname.startsWith(path));
          if (cacheable) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(url.pathname, copy));
          }
          return response;
        })
        .catch(async () => (await caches.match(url.pathname, { cacheName: PAGES_CACHE })) || caches.match(OFFLINE_URL))
    );
    return;
  }

  // Peticiones RSC de Next (navegación interna): siempre a la red; si fallan, Next recarga la
  // página completa y esa navegación sí se sirve desde PAGES_CACHE.
  if (request.headers.get("RSC")) return;

  if (DEV) {
    event.respondWith(networkFirst(request, CACHE_NAME));
    return;
  }

  event.respondWith(cacheFirst(request, CACHE_NAME, false));
});

async function cacheFirst(request, cacheName, allowOpaque) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || (allowOpaque && response.type === "opaque")) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}
