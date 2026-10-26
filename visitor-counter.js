// Privacy-friendly unique-visitor counter.
//
// A visitor is counted once per day. They are recognised by a SHA-256 hash
// of (daily random salt + IP + user agent). The salt is replaced every day
// and old hashes are discarded, so no IP address is ever stored and
// yesterday's visitors cannot be re-identified. No cookies are used.
//
// The count lives in DATA_DIR/visitors.json. In production DATA_DIR must be
// a persistent volume, otherwise every redeploy starts again from zero.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const FILE = path.join(DATA_DIR, 'visitors.json');
const SAVE_INTERVAL_MS = 30 * 1000;

// Crawlers, link previews, uptime monitors and scripts are not visitors.
const BOT_PATTERN = /bot|crawl|spider|slurp|archiver|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|slack|curl|wget|python|httpclient|axios|node-fetch|go-http|java\/|okhttp|headless|lighthouse|pagespeed|monitor|uptime|pingdom|gptbot|claude|perplexity|bytespider|semrush|ahrefs|mj12/i;

// Paths that are not pages a person reads.
const SKIP_PATH = /^\/(assets\/|robots\.txt|sitemap\.xml|llms\.txt|favicon)/;

const today = () => new Date().toISOString().slice(0, 10);

let state = { total: 0, day: today(), salt: crypto.randomBytes(16).toString('hex'), seen: [] };
let seen = new Set();
let dirty = false;

try {
  const saved = JSON.parse(fs.readFileSync(FILE, 'utf-8'));
  if (Number.isInteger(saved.total) && saved.total >= 0) {
    state = saved;
    seen = new Set(saved.seen || []);
  }
} catch (err) {
  if (err.code !== 'ENOENT') console.error('Visitor counter: could not read saved count:', err.message);
}

function rollDay() {
  const d = today();
  if (state.day !== d) {
    state.day = d;
    state.salt = crypto.randomBytes(16).toString('hex');
    seen = new Set();
    dirty = true;
  }
}

function save() {
  if (!dirty) return;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ total: state.total, day: state.day, salt: state.salt, seen: [...seen] }));
    fs.renameSync(tmp, FILE); // atomic replace, so a crash can't leave a half-written file
    dirty = false;
  } catch (err) {
    console.error('Visitor counter: could not save count:', err.message);
  }
}

setInterval(save, SAVE_INTERVAL_MS).unref();
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => { save(); process.exit(0); });
}

// Express middleware: records the visit (if it is one) and exposes the
// current total to every template as `visitorCount`.
function visitorCounter(req, res, next) {
  const ua = req.get('user-agent') || '';
  const isPageView = req.method === 'GET'
    && !SKIP_PATH.test(req.path)
    && (req.get('accept') || '').includes('text/html')
    && ua !== ''
    && !BOT_PATTERN.test(ua);

  if (isPageView) {
    rollDay();
    const id = crypto.createHash('sha256').update(state.salt + '|' + req.ip + '|' + ua).digest('hex').slice(0, 32);
    if (!seen.has(id)) {
      seen.add(id);
      state.total += 1;
      dirty = true;
    }
  }

  res.locals.visitorCount = state.total;
  next();
}

module.exports = { visitorCounter };
