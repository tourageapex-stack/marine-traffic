export interface FeedbackPayload {
  name: string;
  email: string;
  message: string;
  honey?: string;
}

const FORMSUBMIT_ID = 'c5352bf1db18cb77f845d103ce4a553b';

export async function sendFeedback(payload: FeedbackPayload): Promise<void> {
  const name = payload.name.trim();
  const email = payload.email.trim();
  const message = payload.message.trim();

  if (!name || !email || !message) {
    throw new Error('Please fill in your name, email, and message.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please enter a valid email address.');
  }

  const response = await fetch(`https://formsubmit.co/ajax/${FORMSUBMIT_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      name,
      email,
      message,
      _honey: payload.honey || '',
      _subject: `River Watch feedback from ${name}`,
      _replyto: email,
      _template: 'table',
      _captcha: 'false',
    }),
  });

  let result: { success?: string | boolean; message?: string } = {};
  try {
    result = await response.json();
  } catch {
    result = {};
  }

  const succeeded = result.success === true || result.success === 'true';
  if (!response.ok || !succeeded) {
    throw new Error(result.message || 'Failed to send feedback. Please try again.');
  }
}
