import { isAuthenticated } from './lib/auth.js';
import { readJson, sendJson } from './lib/http.js';
import { uploadPublicBytes } from './lib/store.js';

const GEMINI_MODELS = [
  'gemini-2.5-flash-image',
  'gemini-3.1-flash-image-preview',
  'gemini-2.0-flash-preview-image-generation',
];

function getApiKey() {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';
}

function buildPrompt({ title, date, kicker }) {
  const details = [kicker, title, date].filter(Boolean).join(' — ');
  return [
    'Create a square announcement graphic for a Columbia River ship traffic dashboard called River Watch.',
    'Style: clean maritime poster, realistic river ships or docks, subtle seasonal or event mood matching the text,',
    'professional, high contrast, no tiny illegible text, no logos of real companies, no watermarks.',
    `Announcement subject: ${details || 'River Watch announcement'}.`,
    'Leave a soft dark area suitable for overlaying a short title.',
  ].join(' ');
}

function pickAccent(text) {
  const value = String(text || '').toLowerCase();
  if (/(halloween|spook|pumpkin)/.test(value)) return '#ea580c';
  if (/(thanks|harvest|turkey)/.test(value)) return '#b45309';
  if (/(christmas|santa|yule|evergreen)/.test(value)) return '#15803d';
  if (/(new year|nye|countdown)/.test(value)) return '#7c3aed';
  if (/(july|independence|4th|fourth)/.test(value)) return '#dc2626';
  if (/(valentine|love|heart)/.test(value)) return '#e11d48';
  if (/(patrick|irish|clover)/.test(value)) return '#16a34a';
  if (/(winter|snow|ice)/.test(value)) return '#0284c7';
  if (/(summer|sun)/.test(value)) return '#0ea5e9';
  if (/(spring|bloom)/.test(value)) return '#16a34a';
  if (/(fall|autumn)/.test(value)) return '#ea580c';
  return '#2563eb';
}

function extractImagePart(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    const inline = part.inlineData || part.inline_data;
    if (inline?.data) {
      return {
        mimeType: inline.mimeType || inline.mime_type || 'image/png',
        data: inline.data,
      };
    }
  }
  return null;
}

async function callGemini(model, prompt, apiKey) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      }),
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload?.error?.message ||
      payload?.error?.status ||
      `Gemini request failed (${response.status})`;
    throw new Error(message);
  }

  const image = extractImagePart(payload);
  if (!image) {
    throw new Error('Gemini returned no image for this prompt.');
  }

  return { image, model };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  if (!isAuthenticated(req)) {
    sendJson(res, 401, { error: 'Sign in required.' });
    return;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    sendJson(res, 503, {
      error:
        'Gemini is not configured. Add GEMINI_API_KEY in the Vercel project environment variables.',
    });
    return;
  }

  try {
    const body = await readJson(req);
    const title = String(body.title || '').trim().slice(0, 120);
    const date = String(body.date || '').trim().slice(0, 80);
    const kicker = String(body.kicker || '').trim().slice(0, 40);
    if (!title) {
      sendJson(res, 400, { error: 'Give the announcement a title first.' });
      return;
    }

    const prompt = buildPrompt({ title, date, kicker });
    let generated = null;
    let lastError = null;

    for (const model of GEMINI_MODELS) {
      try {
        generated = await callGemini(model, prompt, apiKey);
        break;
      } catch (error) {
        lastError = error;
      }
    }

    if (!generated) {
      sendJson(res, 502, {
        error: lastError instanceof Error ? lastError.message : 'Gemini image generation failed.',
      });
      return;
    }

    const buffer = Buffer.from(generated.image.data, 'base64');
    const extension = generated.image.mimeType.includes('jpeg') ? 'jpg' : 'png';
    const uploadedUrl = await uploadPublicBytes(
      `river-watch-announcements/${Date.now()}.${extension}`,
      buffer,
      generated.image.mimeType
    );

    const imageUrl =
      uploadedUrl || `data:${generated.image.mimeType};base64,${generated.image.data}`;
    const accent = pickAccent(`${kicker} ${title} ${date}`);

    sendJson(res, 200, {
      imageUrl,
      accent,
      background: accent,
      prompt,
      model: generated.model,
      storedInBlob: Boolean(uploadedUrl),
    });
  } catch (error) {
    sendJson(res, 500, {
      error: error instanceof Error ? error.message : 'Could not generate announcement art.',
    });
  }
}
