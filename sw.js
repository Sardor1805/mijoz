/* ============================================================
   SERVICE WORKER — Telefon Savdo (PWA)
   ============================================================ */

const CACHE_NOMI = "telefon-savdo-v2"; // Versiyani o'zgartirdik (v1 dan v2 ga)
const STATIK_FAYLLAR = [
  "/Savdo/",
  "/Savdo/index.html",
  "/Savdo/style.css",
  "/Savdo/app.js",
  "/Savdo/manifest.json",
  "/Savdo/icon-192.png",
  "/Savdo/icon-512.png"
];

// 1. INSTALL (Fayllarni keshga yuklash)
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NOMI).then((cache) => {
      // Agar rasm fayllari topilmasa ham sayt ishlashi uchun allSettled ishlatamiz
      return Promise.allSettled(
        STATIK_FAYLLAR.map(url => cache.add(url))
      );
    }).then(() => self.skipWaiting())
  );
});

// 2. ACTIVATE (Eski keshlarni tozalash)
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NOMI) {
            return caches.delete(key); // v1 ni o'chiradi
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. FETCH (So'rovlarni boshqarish)
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Supabase API so'rovlarini keshlamaymiz (har doim yangi ma'lumot olishi kerak)
  if (url.includes("supabase.co") || url.includes("/rest/v1/")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Statik fayllar uchun: Avval keshdan qidiramiz
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

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
        // Offline bo'lsa va sahifa so'ralsa, index.html ni qaytaramiz
        if (event.request.mode === 'navigate') {
          return caches.match("/Savdo/index.html");
        }
      });
    })
  );
});
