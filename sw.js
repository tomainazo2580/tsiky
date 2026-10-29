const CACHE = "tsiky-v30.4";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) =>
    Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
      const copie = resp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copie));
      return resp;
    }))
  );
});

/* v30.4 : NOTIFICATIONS APP FERMÉE — le téléphone reçoit l'alerte push.
   App ouverte et visible → aucune notification (le message s'affiche déjà,
   comme WhatsApp). App fermée ou en arrière-plan → notification qui vibre. */
self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) {}
  e.waitUntil((async () => {
    try {
      const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      if (cl.some((c) => c.focused)) return;
      await self.registration.showNotification(d.p ? "Tsiky — " + d.p : "Tsiky", {
        body: d.b || "Nouveau message",
        icon: "./icon-192.png",
        badge: "./icon-192.png",
        tag: "tsiky-msg",
        renotify: true,
        vibrate: [140, 90, 140],
        data: { url: "./index.html" }
      });
    } catch (_) {}
  })());
});

/* Toucher la notification ouvre (ou ramène) Tsiky */
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil((async () => {
    const cl = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of cl) {
      if ("focus" in c) { try { await c.focus(); } catch (_) {} return; }
    }
    return self.clients.openWindow((e.notification.data && e.notification.data.url) || "./index.html");
  })());
});
