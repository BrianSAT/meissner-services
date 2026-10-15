/** Private, short-lived recording previews. Never part of the public app cache. */
export const draftLifetimeMs = 24 * 60 * 60 * 1000;
export function audioDraftStore(indexedDB = globalThis.indexedDB, now = Date.now) {
  let opening;
  function open() {
    if (!indexedDB) return Promise.reject(new Error('Preview storage unavailable. Keep this tab open until you attach or delete the preview.'));
    return opening ||= new Promise((resolve, reject) => {
      const request = indexedDB.open('echo-private-audio-previews', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('previews', {keyPath:'key'});
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Preview storage unavailable. Keep this tab open until you attach or delete the preview.'));
      request.onblocked = () => reject(new Error('Preview storage is blocked by another tab. Keep this tab open until you attach or delete the preview.'));
    });
  }
  async function transaction(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('previews', mode), request = action(tx.objectStore('previews'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(new Error('Could not update private preview storage. Keep the tab open, or clear this browser’s site data to remove stored copies.'));
    });
  }
  return {
    async list(sid, rater) {
      const rows = await transaction('readonly', store => store.getAll());
      const expired = rows.filter(row => now() - row.created_at >= draftLifetimeMs);
      await Promise.all(expired.map(row => transaction('readwrite', store => store.delete(row.key))));
      return rows.filter(row => row.sid === sid && row.rater === rater && now() - row.created_at < draftLifetimeMs);
    },
    put(row) { return transaction('readwrite', store => store.put({...row, created_at:now()})); },
    remove(key) { return transaction('readwrite', store => store.delete(key)); }
  };
}
