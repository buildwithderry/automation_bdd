/**
 * Aturan kelayakan selector (dipakai resolver + linter).
 * Prinsip: pakai atribut yang stabil & terlihat/dimaksudkan developer, bukan hasil generate framework.
 */

/** id/atribut yang jelas hasil generate framework -> DILARANG jadi primary. */
const GENERATED_ID_PATTERNS = [
  /^:r[0-9a-z]+:$/i,           // React useId  -> :r3:
  /^«.+»$/,                     // Angular
  /^mui-\d+$/i,                 // MUI
  /^headlessui-[a-z-]+-\d+$/i,  // HeadlessUI
  /^radix-[:a-z0-9-]+$/i,       // Radix
  /^input-\d+$/i,               // generic sequential
  /^field-\d+$/i,
  /^[a-z]+-\d{3,}$/i,           // foo-12345
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // uuid
  /^[a-z0-9]{20,}$/i,           // hash panjang
];

/** rantai class utility (tailwind dsb) -> tidak boleh jadi selector. */
const UTILITY_CLASS_HINT = /\.(flex|grid|px-|py-|mt-|mb-|text-|bg-|rounded|border-|w-|h-|gap-|items-|justify-)/;

function isGeneratedId(id) {
  if (!id) return false;
  return GENERATED_ID_PATTERNS.some((re) => re.test(String(id)));
}

function looksLikeUtilityClassChain(cssSelector) {
  if (!cssSelector) return false;
  const classCount = (String(cssSelector).match(/\./g) || []).length;
  return classCount >= 2 && UTILITY_CLASS_HINT.test(String(cssSelector));
}

/** Peringkat default: makin kecil makin diprioritaskan. */
const RANK = {
  testid: 10,
  id: 20,
  name: 25,
  role: 30,
  label: 35,
  placeholder: 40,
  text: 50,
  css: 70,
  xpath: 80,
};

module.exports = { isGeneratedId, looksLikeUtilityClassChain, RANK, GENERATED_ID_PATTERNS };
