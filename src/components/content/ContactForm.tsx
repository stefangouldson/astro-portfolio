import { useState, type FormEvent } from 'react';

type Field = 'name' | 'email' | 'message';

const FIELDS: Field[] = ['name', 'email', 'message'];

const MESSAGES: Record<Field, string> = {
  name: 'Name is required',
  email: 'A valid email address is required',
  message: 'A message is required',
};

const isValid = (field: Field, value: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) return false;
  // Deliberately loose — the server is the real check.
  if (field === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
  return true;
};

export default function ContactForm() {
  const [values, setValues] = useState<Record<Field, string>>({
    name: '',
    email: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<Field, boolean>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const update = (field: Field, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Only clear errors as you type; don't flag a field you haven't finished.
    if (errors[field] && isValid(field, value)) {
      setErrors((prev) => ({ ...prev, [field]: false }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    const nextErrors = Object.fromEntries(
      FIELDS.map((field) => [field, !isValid(field, values[field])]),
    ) as Record<Field, boolean>;
    setErrors(nextErrors);

    const firstInvalid = FIELDS.find((field) => nextErrors[field]);
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const body = new URLSearchParams({ 'form-name': 'contact', ...values });
      const response = await fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      window.location.assign('/success');
    } catch (error) {
      setSubmitting(false);
      setSubmitError(
        error instanceof Error
          ? `Sorry, that didn't send: ${error.message}. Please try again or email me directly.`
          : "Sorry, that didn't send. Please try again.",
      );
    }
  };

  return (
    <form
      className="contact-form"
      name="contact"
      method="post"
      action="/success"
      data-netlify="true"
      data-netlify-honeypot="bot-field"
      onSubmit={handleSubmit}
      noValidate
    >
      <input type="hidden" name="form-name" value="contact" />
      <p hidden>
        <label>
          Don't fill this out: <input name="bot-field" />
        </label>
      </p>

      <div className="form-control">
        <label htmlFor="name">Your Name</label>
        <input
          className={`input${errors.name ? ' input-error' : ''}`}
          type="text"
          id="name"
          name="name"
          placeholder="Enter your name"
          autoComplete="name"
          value={values.name}
          onChange={(e) => update('name', e.target.value)}
          aria-invalid={errors.name || undefined}
          aria-describedby={errors.name ? 'name-error' : undefined}
        />
        {errors.name && <small id="name-error" className="field-error">{MESSAGES.name}</small>}
      </div>

      <div className="form-control">
        <label htmlFor="email">Email Address</label>
        <input
          className={`input${errors.email ? ' input-error' : ''}`}
          type="email"
          id="email"
          name="email"
          placeholder="Enter your email"
          autoComplete="email"
          value={values.email}
          onChange={(e) => update('email', e.target.value)}
          aria-invalid={errors.email || undefined}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && <small id="email-error" className="field-error">{MESSAGES.email}</small>}
      </div>

      <div className="form-control">
        <label htmlFor="message">Message</label>
        <textarea
          className={`input${errors.message ? ' input-error' : ''}`}
          id="message"
          name="message"
          rows={4}
          placeholder="What's your enquiry?"
          value={values.message}
          onChange={(e) => update('message', e.target.value)}
          aria-invalid={errors.message || undefined}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {errors.message && (
          <small id="message-error" className="field-error">{MESSAGES.message}</small>
        )}
      </div>

      <button className="button" type="submit" disabled={submitting}>
        {submitting ? 'Sending…' : 'Contact'}
      </button>

      <p className="form-status" role="status" aria-live="polite">
        {submitError}
      </p>
    </form>
  );
}
