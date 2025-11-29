<!-- /public/db.js -->
// why: local gallery per user (device-only) via IndexedDB.
const DB_NAME = 'aips-db';
const STORE = 'gallery';

function openDB(){
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const os = db.createObjectStore(STORE, { keyPath: 'id' });
        os.createIndex('by_user_time', ['sub','ts'], { unique: false });
      }
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}
export async function saveImage({ sub, blob, mime }){
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  const id = `${sub}:${Date.now()}`;
  await tx.objectStore(STORE).put({ id, sub, ts: Date.now(), mime, blob });
  await new Promise((r, j) => { tx.oncomplete = r; tx.onerror = () => j(tx.error); });
  return id;
}
export async function listImages({ sub, cursor = null, limit = 24 }){
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const idx = tx.objectStore(STORE).index('by_user_time');
  const range = IDBKeyRange.bound([sub, 0], [sub, Number.MAX_SAFE_INTEGER], false, false);
  const items = []; let count = 0;
  return await new Promise((resolve) => {
    idx.openCursor(range, 'prev').onsuccess = (e) => {
      const cur = e.target.result;
      if (!cur) return resolve({ items, nextCursor: null });
      if (cursor && cur.primaryKey >= cursor) { cur.continue(); return; }
      items.push({ id: cur.value.id, ts: cur.value.ts, mime: cur.value.mime, blob: cur.value.blob });
      count++; 
      if (count >= limit) resolve({ items, nextCursor: cur.primaryKey });
      else cur.continue();
    };
  });
}
