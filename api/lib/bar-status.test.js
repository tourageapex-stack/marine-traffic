import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isBotChallenge,
  loadBarStatus,
  parseBarStatusHtml,
  parseMerchantsExchangeStatus,
} from './bar-status.js';

const PILOTS_HTML = `
<div class="bar-color" style="background-color:Red;width:15%;height:40px;float:left;"></div>
<div class="fl-post-text">
  <div class="fl-post-meta"><strong>November 16, 2026</strong></div>
  <p>Pilot service suspended due to heavy swell. Conditions are forecasted to improve Monday morning.</p>
</div>`;

const CHALLENGE_HTML =
  '<html><head><meta http-equiv="refresh" content="0;/.well-known/sgcaptcha/?r=%2Fbar-status%2F"></head></html>';

test('parses the pilots page color, date, and detail', () => {
  const status = parseBarStatusHtml(PILOTS_HTML);
  assert.equal(status.color, 'red');
  assert.equal(status.rating, 'RED');
  assert.equal(status.date, 'November 16, 2026');
  assert.match(status.detail, /heavy swell/);
  assert.equal(status.sourceUrl, 'https://www.columbiariverbarpilots.com/bar-status/');
});

test('treats the pilots bot challenge as unusable', () => {
  assert.equal(isBotChallenge(CHALLENGE_HTML, 202), true);
  assert.equal(parseBarStatusHtml(CHALLENGE_HTML), null);
  assert.equal(isBotChallenge(PILOTS_HTML, 200), false);
});

test('reads the Merchants Exchange status when the pilots page is challenged', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('columbiariverbarpilots.com')) {
      return {
        status: 202,
        ok: true,
        text: async () => CHALLENGE_HTML,
      };
    }
    return {
      status: 200,
      ok: true,
      json: async () => ({
        curStatus: 'red',
        curStatusReason:
          'Date: 11/15/2026\nColor: Red\nPreviously: Yellow\nNotes: Pilot service suspended due to heavy swell.',
        settings: { settings_override: false },
      }),
    };
  };

  const status = await loadBarStatus(fetchImpl);
  assert.equal(status.color, 'red');
  assert.equal(status.rating, 'RED');
  assert.equal(status.date, 'November 15, 2026');
  assert.equal(status.detail, 'Pilot service suspended due to heavy swell.');
  assert.equal(status.label, 'No, or very limited, inbound or outbound traffic.');
});

test('prefers the pilots page when it returns the status', async () => {
  const fetchImpl = async (url) => {
    if (String(url).includes('columbiariverbarpilots.com')) {
      return { status: 200, ok: true, text: async () => PILOTS_HTML };
    }
    return {
      status: 200,
      ok: true,
      json: async () => ({ curStatus: 'green', curStatusReason: 'Notes: Open.', settings: {} }),
    };
  };

  const status = await loadBarStatus(fetchImpl);
  assert.equal(status.color, 'red');
  assert.match(status.detail, /heavy swell/);
});

test('uses an admin override from the exchange payload', () => {
  const status = parseMerchantsExchangeStatus({
    curStatus: 'green',
    curStatusReason: 'Notes: Open.',
    settings: {
      settings_override: true,
      settings_override_level: 'yellow',
      settings_override_reason: 'Inbound traffic delayed for fog.',
    },
  });
  assert.equal(status.color, 'yellow');
  assert.equal(status.detail, 'Inbound traffic delayed for fog.');
});
