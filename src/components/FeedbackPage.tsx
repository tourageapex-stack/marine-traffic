import { useState, type FormEvent } from 'react';
import { sendFeedback } from '../services/feedback';

interface FeedbackPageProps {
  onBack: () => void;
}

export function FeedbackPage({ onBack }: FeedbackPageProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [honey, setHoney] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await sendFeedback({ name, email, message, honey });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="feedback-card">
        <div className="feedback-success-icon">✓</div>
        <h2 className="feedback-title">Thanks for the note</h2>
        <p className="feedback-copy">
          Your message is on its way. We'll read it and use it to improve the dashboard.
        </p>
        <button className="submit-button" type="button" onClick={onBack}>
          Back to dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="feedback-card">
      <h2 className="feedback-title">Give Feedback</h2>
      <p className="feedback-copy">
        Found a bug, have an idea, or want a new feature? Send a note and it goes
        straight to the team.
      </p>

      <form className="feedback-form" onSubmit={handleSubmit}>
        <div className="form-group honey-field" aria-hidden="true">
          <label htmlFor="feedback-company">Company</label>
          <input
            id="feedback-company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honey}
            onChange={(e) => setHoney(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="feedback-name">Name</label>
          <input
            id="feedback-name"
            type="text"
            name="name"
            autoComplete="name"
            maxLength={100}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="feedback-email">Email</label>
          <input
            id="feedback-email"
            type="email"
            name="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="feedback-message">Feedback or feature request</label>
          <textarea
            id="feedback-message"
            name="message"
            maxLength={2000}
            required
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What's working, what's missing, or what you'd like to see next..."
          />
        </div>

        {error && <div className="form-error">{error}</div>}

        <button className="submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send Feedback'}
        </button>
      </form>
    </div>
  );
}
