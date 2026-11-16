const SOURCE_URL = 'https://www.columbiariverbarpilots.com/bar-status/';
const EXCHANGE_URL = 'https://www.pdxmex.com/wp-json/pdxmex/v1/bar-status';

const PAGE_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'en-US,en;q=0.9',
  // A short custom agent is challenged by the pilots site. A normal browser agent is not.
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Safari/605.1.15',
};

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const COLOR_LABELS = {
  green: {
    rating: 'GREEN',
    label: 'Normal operations. No delays anticipated.',
  },
  yellow: {
    rating: 'YELLOW',
    label: 'Some inbound or outbound delays can be expected.',
  },
  red: {
    rating: 'RED',
    label: 'No, or very limited, inbound or outbound traffic.',
  },
};

export function decodeHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, digits) => String.fromCharCode(Number(digits)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeBarColor(value) {
  const color = String(value || '').trim().toLowerCase();
  if (!color) return null;
  if (color === 'red' || color === '#f00' || color === '#ff0000' || color === '#c23037' || color.includes('red')) {
    return 'red';
  }
  if (
    color === 'yellow' ||
    color === '#ff0' ||
    color === '#ffff00' ||
    color === '#f7c348' ||
    color.includes('yellow') ||
    color.includes('gold') ||
    color.includes('amber')
  ) {
    return 'yellow';
  }
  if (
    color === 'green' ||
    color === '#008000' ||
    color === '#0f0' ||
    color === '#00ff00' ||
    color === '#61ce70' ||
    color.includes('green')
  ) {
    return 'green';
  }
  return null;
}

export function isBotChallenge(body, status) {
  if (status != null && Number(status) !== 200) return true;
  const text = String(body || '');
  if (/class="bar-color"/i.test(text)) return false;
  return /sgcaptcha|robot challenge screen/i.test(text);
}

export function parseBarStatusHtml(html) {
  const chunks = String(html || '').split(/class="bar-color"/i).slice(1);
  let best = null;

  for (const chunk of chunks) {
    const style = (chunk.match(/style="([^"]*)"/i) || [])[1] || '';
    const colorValue = (style.match(/background(?:-color)?\s*:\s*([^;"]+)/i) || [])[1] || '';
    const color = normalizeBarColor(colorValue);
    const date = decodeHtml((chunk.match(/<strong>([\s\S]*?)<\/strong>/i) || [])[1] || '').replace(
      /\s*-\s*Bar Status Details\s*>?\s*$/i,
      ''
    );
    const detail = decodeHtml((chunk.match(/<p>([\s\S]*?)<\/p>/i) || [])[1] || '');
    const candidate = { color, date, detail };
    if (!best) best = candidate;
    if (color && detail) {
      best = candidate;
      break;
    }
  }

  if (!best?.color || !COLOR_LABELS[best.color]) return null;
  return toBarStatus(best.color, best.detail, best.date);
}

export function formatStatusDate(value) {
  const match = String(value || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (!match) return '';
  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

function detailFromReason(reason) {
  const text = String(reason || '').replace(/\r/g, '').trim();
  const notes = text.match(/(?:^|\n)Notes:\s*([\s\S]*)$/i);
  if (notes && notes[1].trim()) return decodeHtml(notes[1]);
  return decodeHtml(
    text
      .split('\n')
      .filter((line) => !/^(Date|Color|Previously):/i.test(line.trim()))
      .join(' ')
  );
}

function isOverride(value) {
  return value === true || value === 1 || value === '1' || value === 'true';
}

export function parseMerchantsExchangeStatus(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const settings = payload.settings || {};
  const override = isOverride(settings.settings_override);
  const color = normalizeBarColor(override ? settings.settings_override_level : payload.curStatus);
  if (!color || !COLOR_LABELS[color]) return null;

  const reason = override ? settings.settings_override_reason : payload.curStatusReason;
  const text = String(reason || '');
  const date = formatStatusDate((text.match(/Date:\s*([0-9/]+)/i) || [])[1] || '');
  return toBarStatus(color, detailFromReason(text), date);
}

function toBarStatus(color, detail, date) {
  const known = COLOR_LABELS[color];
  if (!known) return null;
  return {
    color,
    rating: known.rating,
    label: known.label,
    detail: detail || '',
    date: date || '',
    sourceUrl: SOURCE_URL,
  };
}

async function readPilotsPage(fetchImpl) {
  const response = await fetchImpl(SOURCE_URL, {
    headers: PAGE_HEADERS,
    signal: AbortSignal.timeout(8000),
  });
  const html = await response.text();
  if (isBotChallenge(html, response.status)) return null;
  return parseBarStatusHtml(html);
}

async function readExchangeStatus(fetchImpl) {
  const response = await fetchImpl(EXCHANGE_URL, {
    headers: {
      Accept: 'application/json',
      'User-Agent': PAGE_HEADERS['User-Agent'],
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const body = await response.json();
  return parseMerchantsExchangeStatus(body);
}

function withTimeout(promise, ms) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value ?? null);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      }
    );
  });
}

export async function loadBarStatus(fetchImpl = fetch) {
  const pilotsPromise = readPilotsPage(fetchImpl).catch(() => null);
  const exchangePromise = readExchangeStatus(fetchImpl).catch(() => null);
  const fromPilots = await withTimeout(pilotsPromise, 4000);
  if (fromPilots) return fromPilots;
  const fromExchange = await exchangePromise;
  if (fromExchange) return fromExchange;
  return pilotsPromise;
}
