/**
 * Perekam network (listening request/response) -> JSON.
 *
 * Tujuan: setiap endpoint yang di-hit saat UI test tersimpan, jadi flow yang butuh
 * data baru (mis. company baru) nanti bisa direplay lewat API helper tanpa UI.
 *
 * Output:
 *   artifacts/endpoints/<slug>.json        -> semua call pada 1 test (berurutan)
 *   artifacts/endpoints/_catalog.json      -> katalog unik METHOD + path (template) untuk reuse
 */
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.resolve(__dirname, '..', 'artifacts', 'endpoints');
const CATALOG = path.join(OUT_DIR, '_catalog.json');

const STATIC_EXT = /\.(js|mjs|css|png|jpe?g|gif|svg|webp|ico|woff2?|ttf|eot|map|avif)(\?|$)/i;
const NOISE_HOST = /(google|gstatic|googletagmanager|doubleclick|facebook|hotjar|sentry|clarity\.ms)/i;
const SECRET_KEYS = /^(password|new_password|old_password|confirm_password|token|access_token|refresh_token|authorization|secret|otp)$/i;

/** /api/resource/1234 -> /api/resource/:id ; uuid juga dimask. */
function templatize(pathname) {
  return pathname
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid')
    .replace(/\/\d{2,}/g, '/:id')
    .replace(/\/[0-9a-f]{24,}/gi, '/:hash');
}

function redact(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = SECRET_KEYS.test(k) ? '***redacted***' : redact(v);
    }
    return out;
  }
  return value;
}

function safeJson(text, limit = 200000) {
  if (!text) return null;
  if (text.length > limit) return { _truncated: true, _bytes: text.length };
  try {
    return redact(JSON.parse(text));
  } catch {
    return null;
  }
}

class NetworkRecorder {
  /**
   * @param {{hosts?: string[], includeAll?: boolean}} [opts] hosts = daftar host aplikasi yang direkam
   */
  constructor(opts = {}) {
    this.calls = [];
    this.hosts = (opts.hosts || []).filter(Boolean).map((h) => {
      try { return new URL(h).host; } catch { return h; }
    });
    this.includeAll = !!opts.includeAll;
    this._pages = new Set();
  }

  _relevant(url, resourceType) {
    if (STATIC_EXT.test(url)) return false;
    let host;
    try { host = new URL(url).host; } catch { return false; }
    if (NOISE_HOST.test(host)) return false;
    if (!this.includeAll && this.hosts.length && !this.hosts.includes(host)) return false;
    if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) return false;
    return true;
  }

  attach(page) {
    if (this._pages.has(page)) return this;
    this._pages.add(page);

    page.on('response', async (response) => {
      const request = response.request();
      const url = request.url();
      const resourceType = request.resourceType();
      if (!this._relevant(url, resourceType)) return;

      const u = new URL(url);
      const entry = {
        seq: this.calls.length + 1,
        at: new Date().toISOString(),
        method: request.method(),
        url,
        host: u.host,
        path: u.pathname,
        pathTemplate: templatize(u.pathname),
        query: Object.fromEntries(u.searchParams.entries()),
        resourceType,
        status: response.status(),
        ok: response.ok(),
        requestHeaders: this._pickHeaders(request.headers()),
        requestBody: safeJson(request.postData()),
        responseBody: null,
        timingMs: null,
      };
      try {
        const ct = (response.headers()['content-type'] || '');
        if (ct.includes('json')) entry.responseBody = safeJson(await response.text());
      } catch { /* body sudah tidak tersedia */ }
      try {
        const t = request.timing();
        if (t && t.responseEnd > 0) entry.timingMs = Math.round(t.responseEnd);
      } catch { /* noop */ }

      this.calls.push(entry);
    });

    page.on('requestfailed', (request) => {
      const url = request.url();
      if (!this._relevant(url, request.resourceType())) return;
      const u = new URL(url);
      this.calls.push({
        seq: this.calls.length + 1,
        at: new Date().toISOString(),
        method: request.method(),
        url,
        host: u.host,
        path: u.pathname,
        pathTemplate: templatize(u.pathname),
        status: null,
        ok: false,
        failure: request.failure()?.errorText || 'request failed',
      });
    });

    return this;
  }

  _pickHeaders(h) {
    const keep = ['content-type', 'accept', 'x-requested-with'];
    const out = {};
    for (const k of keep) if (h[k]) out[k] = h[k];
    if (h['authorization']) out['authorization'] = 'Bearer ***redacted***';
    return out;
  }

  /** Ambil call yang match method+substring path. */
  find(method, pathContains) {
    return this.calls.filter(
      (c) => c.method.toUpperCase() === method.toUpperCase() && c.path.includes(pathContains)
    );
  }

  get apiCalls() {
    return this.calls.filter((c) => /\/(api|v\d)\//i.test(c.path) || c.resourceType === 'xhr' || c.resourceType === 'fetch');
  }

  /** Simpan detail per test + update katalog global. */
  save(slug, meta = {}) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const file = path.join(OUT_DIR, `${slug}.json`);
    const payload = {
      meta: { slug, savedAt: new Date().toISOString(), totalCalls: this.calls.length, ...meta },
      calls: this.calls,
    };
    fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf8');
    this._updateCatalog(slug);
    return file;
  }

  _updateCatalog(slug) {
    let catalog = { updatedAt: null, endpoints: {} };
    if (fs.existsSync(CATALOG)) {
      try { catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8')); } catch { /* reset */ }
    }
    for (const c of this.apiCalls) {
      const key = `${c.method} ${c.host}${c.pathTemplate}`;
      const prev = catalog.endpoints[key];
      catalog.endpoints[key] = {
        method: c.method,
        host: c.host,
        pathTemplate: c.pathTemplate,
        samplePath: c.path,
        statuses: Array.from(new Set([...(prev?.statuses || []), c.status].filter((s) => s !== null))),
        hits: (prev?.hits || 0) + 1,
        seenIn: Array.from(new Set([...(prev?.seenIn || []), slug])),
        sampleQuery: Object.keys(c.query || {}).length ? c.query : prev?.sampleQuery || null,
        sampleRequestBody: c.requestBody ?? prev?.sampleRequestBody ?? null,
        sampleResponseBody: prev?.sampleResponseBody ?? c.responseBody ?? null,
      };
    }
    catalog.updatedAt = new Date().toISOString();
    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(CATALOG, JSON.stringify(catalog, null, 2), 'utf8');
  }
}

module.exports = { NetworkRecorder, templatize, OUT_DIR, CATALOG };
