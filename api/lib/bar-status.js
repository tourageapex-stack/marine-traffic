const SOURCE_URL = 'https://www.columbiariverbarpilots.com/bar-status/';

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
  if (color === 'red' || color === '#f00' || color === '#ff0000' || color.includes('red')) return 'red';
  if (
    color === 'yellow' ||
    color === '#ff0' ||
    color === '#ffff00' ||
    color.includes('yellow') ||
    color.includes('gold') ||
    color.includes('amber')
  ) {
    return 'yellow';
  }
  if (color === 'green' || color === '#008000' || color === '#0f0' || color === '#00ff00' || color.includes('green')) {
    return 'green';
  }
  return null;
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
  const known = COLOR_LABELS[best.color];

  return {
    color: best.color,
    rating: known.rating,
    label: known.label,
    detail: best.detail,
    date: best.date,
    sourceUrl: SOURCE_URL,
  };
}
