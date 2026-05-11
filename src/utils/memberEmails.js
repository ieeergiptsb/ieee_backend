import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { getEmailToDesignationMap } from '../data/team-structure.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to email.json at repo root  (backend is at <root>/backend)
const EMAIL_JSON_PATH = resolve(__dirname, '..', '..', '..', 'email.json');

let _cache = null;

/**
 * Load and cache the combined IEEE member email map.
 * Keys are lower-cased emails; values are designations.
 *
 * Priority:
 *  1. Team-structure entries keep their specific designation (Chair, Secretary…)
 *  2. email.json entries that are NOT in team-structure get designation "Member"
 */
function loadMemberMap() {
  if (_cache) return _cache;

  // Start with team-structure designations
  const map = getEmailToDesignationMap(); // { 'email': 'designation' }

  // Merge in email.json whitelist
  try {
    const raw = readFileSync(EMAIL_JSON_PATH, 'utf-8');
    const parsed = JSON.parse(raw);

    // Support both { "emails": [...] } and bare array formats
    const emailList = Array.isArray(parsed) ? parsed : parsed.emails ?? [];

    for (const email of emailList) {
      const normalized = email.toLowerCase().trim();
      if (!map[normalized]) {
        map[normalized] = 'Member'; // default designation for non-committee members
      }
    }

    console.log(`✅ Loaded ${emailList.length} IEEE member emails from email.json`);
  } catch (err) {
    console.warn(`⚠️  Could not read email.json: ${err.message}. Only team-structure emails will be allowed for ieee_member registration.`);
  }

  _cache = map;
  return _cache;
}

/**
 * Normalize email for comparison.
 * Gmail: strip dots from local part.
 */
function normalizeEmail(email) {
  if (!email) return '';
  let n = email.toLowerCase().trim();
  if (n.includes('@gmail.com')) {
    const [local, domain] = n.split('@');
    n = local.replace(/\./g, '') + '@' + domain;
  }
  return n;
}

/**
 * Check whether an email is in the IEEE member whitelist.
 * @param {string} email
 * @returns {boolean}
 */
export function isMemberEmail(email) {
  const map = loadMemberMap();
  const normalized = normalizeEmail(email);
  return normalized in map;
}

/**
 * Get the designation for an IEEE member email.
 * Returns null if the email is not in the whitelist.
 * @param {string} email
 * @returns {string|null}
 */
export function getMemberDesignation(email) {
  const map = loadMemberMap();
  const normalized = normalizeEmail(email);
  return map[normalized] ?? null;
}

/**
 * Invalidate the in-memory cache (useful for hot-reload in dev).
 */
export function invalidateMemberCache() {
  _cache = null;
}
