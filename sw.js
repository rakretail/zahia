const CACHE = "zahia-shell-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
    event.waitUntil((async () => {
        const keys = await caches.keys();
        const old = keys.filter(k => k !== CACHE);
        await Promise.all(old.map(k => caches.delete(k)));
        await self.clients.claim();
        // If an older worker had cached pages, any window still showing one
        // is reloaded once so it picks up the current index.html.
        if (old.length) {
            const wins = await self.clients.matchAll({ type: "window" });
            wins.forEach(w => w.navigate(w.url).catch(() => {}));
        }
    })());
});

self.addEventListener("fetch", event => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (url.origin !== self.location.origin) return;   // Firebase, fonts, CDNs: untouched

    const key = url.origin + url.pathname;              // ignore ?v= cache-busters
    event.respondWith((async () => {
        try {
            const fresh = await fetch(req, { cache: "no-store" });
            if (fresh && fresh.ok) {
                const cache = await caches.open(CACHE);
                cache.put(key, fresh.clone());
            }
            return fresh;
        } catch (err) {
            const hit = await (await caches.open(CACHE)).match(key);
            if (hit) return hit;
            throw err;
        }
    })());
});
