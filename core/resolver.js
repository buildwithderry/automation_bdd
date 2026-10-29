/**
 * Self-healing locator resolver.
 *
 * Konsep: tiap elemen didaftarkan sebagai LIST kandidat berperingkat di file locators/*.
 * Resolver mencoba kandidat berurutan; yang dipakai adalah kandidat pertama yang:
 *   - benar-benar ada di DOM, dan
 *   - unik (count() === 1)  <- strict, supaya tidak menutupi ambiguitas dengan .first()
 *
 * Kalau primary gagal dan fallback yang menyelamatkan, kejadian itu DICATAT
 * ke artifacts/healing/healing-log.json supaya kita tahu selector mana yang perlu
 * diperbaiki di aplikasi (mis. minta developer menambah data-testid).
 */
const fs = require('fs');
const path = require('path');
const { isGeneratedId, looksLikeUtilityClassChain, RANK } = require('./selector_policy');

const HEALING_DIR = path.resolve(__dirname, '..', 'artifacts', 'healing');
const HEALING_FILE = path.join(HEALING_DIR, 'healing-log.json');

/** Ubah 1 kandidat -> Locator Playwright. */
function toLocator(scope, cand) {
  const { by, value, name, exact = false, options } = cand;
  switch (by) {
    case 'testid':
      return scope.getByTestId(value);
    case 'id':
      return scope.locator(`#${CSS_escape(value)}`);
    case 'name':
      return scope.locator(`[name="${value}"]`);
    case 'role':
      return scope.getByRole(value, { name, exact, ...(options || {}) });
    case 'label':
      return scope.getByLabel(value, { exact });
    case 'placeholder':
      return scope.getByPlaceholder(value, { exact });
    case 'text':
      return scope.getByText(value, { exact });
    case 'title':
      return scope.getByTitle(value, { exact });
    case 'alt':
      return scope.getByAltText(value, { exact });
    case 'css':
      return scope.locator(value);
    case 'xpath':
      return scope.locator(`xpath=${value}`);
    default:
      throw new Error(`[resolver] strategi "${by}" tidak dikenal`);
  }
}

/** escape id untuk dipakai di CSS (#id). */
function CSS_escape(v) {
  return String(v).replace(/([ !"#$%&'()*+,.\/:;<=>?@\[\\]^`{|}~])/g, '\$1');
}

function describe(cand) {
  const extra = cand.name ? ` name="${cand.name}"` : '';
  return `${cand.by}=${cand.value}${extra}`;
}

/** Validasi kandidat terhadap policy; kembalikan array warning (tidak melempar). */
function auditCandidates(key, candidates) {
  const warns = [];
  candidates.forEach((c, i) => {
    if (c.by === 'id' && isGeneratedId(c.value)) {
      warns.push(`[${key}] kandidat #${i} pakai id hasil generate framework: "${c.value}"`);
    }
    if (c.by === 'css' && looksLikeUtilityClassChain(c.value)) {
      warns.push(`[${key}] kandidat #${i} pakai rantai class utility: "${c.value}"`);
    }
  });
  return warns;
}

/** Urutkan kandidat: prioritas eksplisit (rank) > peringkat default per strategi. */
function sortCandidates(candidates) {
  return [...candidates]
    .map((c, i) => ({ c, i, rank: c.rank ?? RANK[c.by] ?? 99 }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.c);
}

function recordHealing(entry) {
  try {
    fs.mkdirSync(HEALING_DIR, { recursive: true });
    let log = [];
    if (fs.existsSync(HEALING_FILE)) {
      log = JSON.parse(fs.readFileSync(HEALING_FILE, 'utf8'));
    }
    log.push(entry);
    fs.writeFileSync(HEALING_FILE, JSON.stringify(log, null, 2), 'utf8');
  } catch {
    /* logging tidak boleh menggagalkan test */
  }
}

/**
 * @param {import('@playwright/test').Page|import('@playwright/test').Locator|import('@playwright/test').FrameLocator} scope
 * @param {{key:string, description?:string, candidates:Array<object>}} entry
 * @param {{timeout?:number, allowMany?:boolean, requireVisible?:boolean}} [opts]
 * @returns {Promise<import('@playwright/test').Locator>}
 */
async function resolve(scope, entry, opts = {}) {
  const { timeout = 8000, allowMany = false, requireVisible = true } = opts;
  const key = entry.key || 'unknown';
  const candidates = sortCandidates(entry.candidates || []);
  if (!candidates.length) throw new Error(`[resolver] "${key}" tidak punya kandidat selector`);

  auditCandidates(key, candidates).forEach((w) => console.warn(`[selector-policy] ${w}`));

  const perCandidateTimeout = Math.max(700, Math.floor(timeout / candidates.length));
  const tried = [];

  for (let i = 0; i < candidates.length; i++) {
    const cand = candidates[i];
    let loc;
    try {
      loc = toLocator(scope, cand);
    } catch (e) {
      tried.push({ candidate: describe(cand), reason: `invalid: ${e.message}` });
      continue;
    }

    try {
      const target = requireVisible ? loc.first() : loc.first();
      await target.waitFor({ state: requireVisible ? 'visible' : 'attached', timeout: perCandidateTimeout });
      const n = await loc.count();
      if (n === 0) {
        tried.push({ candidate: describe(cand), reason: 'count=0' });
        continue;
      }
      if (n > 1 && !allowMany) {
        tried.push({ candidate: describe(cand), reason: `ambigu count=${n}` });
        continue;
      }
      if (i > 0) {
        // primary gagal -> fallback menyelamatkan. Catat sebagai sinyal healing.
        recordHealing({
          at: new Date().toISOString(),
          key,
          description: entry.description || '',
          failed: tried.map((t) => t.candidate),
          healedWith: describe(cand),
          detail: tried,
        });
        console.warn(
          `[self-healing] "${key}" -> primary gagal, dipulihkan oleh ${describe(cand)} (kandidat #${i})`
        );
      }
      return loc;
    } catch (e) {
      tried.push({ candidate: describe(cand), reason: (e.message || '').split('\n')[0] });
    }
  }

  const detail = tried.map((t, i) => `  #${i} ${t.candidate} -> ${t.reason}`).join('\n');
  throw new Error(
    `[resolver] Gagal menemukan "${key}"${entry.description ? ` (${entry.description})` : ''}.\nKandidat yang dicoba:\n${detail}`
  );
}

module.exports = { resolve, toLocator, sortCandidates, auditCandidates, HEALING_FILE };
