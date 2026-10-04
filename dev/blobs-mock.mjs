// Implementación en memoria del subconjunto de @netlify/blobs que usa la app (con ETags).
const stores = new Map();
let n = 0;
export function getStore({ name }) {
  if (!stores.has(name)) stores.set(name, new Map());
  const m = stores.get(name);
  const out = (v, type) => type === 'json' ? JSON.parse(v.data) : type === 'arrayBuffer' ? v.data : v.data;
  return {
    async get(k, o = {}) { const v = m.get(k); return v ? out(v, o.type) : null; },
    async getWithMetadata(k, o = {}) { const v = m.get(k); return v ? { data: out(v, o.type), etag: v.etag, metadata: v.metadata } : null; },
    async setJSON(k, d, o = {}) { return this.set(k, JSON.stringify(d), o); },
    async set(k, d, o = {}) {
      const cur = m.get(k);
      if (o.onlyIfNew && cur) return { modified: false };
      if (o.onlyIfMatch && (!cur || cur.etag !== o.onlyIfMatch)) return { modified: false };
      const etag = 'e' + (++n);
      m.set(k, { data: d instanceof ArrayBuffer ? d : d, etag, metadata: o.metadata || {} });
      return { modified: true, etag };
    },
    async delete(k) { m.delete(k); },
  };
}
