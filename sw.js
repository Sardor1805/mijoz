/* ============================================================
   SERVICE WORKER — Telefon Savdo (PWA)
   ============================================================ */

const CACHE_NOMI = "telefon-savdo-v1";
const STATIK_FAYLLAR = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

// 1. INSTALL (O'rnatish paytida fayllarni keshga yuklash)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NOMI)
      .then((cache) => {
        // addAll xato bersa ham davom etishi uchun (rasm yo'q bo'lsa sayt buzilmasligi uchun)
        return Promise.allSettled(
          STATIK_FAYLLAR.map(url => cache.add(url))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE (Eski keshlarni tozalash va yangisini yoqish)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (key !== CACHE_NOMI) {
              return caches.delete(key);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// 3. FETCH (So'rovlarni ushlab qolish)
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Supabase API so'rovlarini keshlamaymiz (har doim yangi ma'lumot olishi kerak)
  if (url.includes("supabase.co") || url.includes("/rest/v1/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Boshqa statik fayllar uchun: Avval keshdan qidiramiz (Cache-First)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // Agar keshda bo'lmasa, tarmoqdan yuklaymiz va keshga saqlaymiz
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const responseToCache = response.clone();
        caches.open(CACHE_NOMI).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return response;
      }).catch(() => {
        // Agar internet bo'lmasa va keshda ham bo'lmasa, offline sahifaga yo'naltirish
        if (event.request.mode === 'navigate') {
          return caches.match("./index.html");
        }
      });
    })
  );
});