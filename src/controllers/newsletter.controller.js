import { Newsletter } from '../models/Newsletter.js';
import { AppError } from '../utils/errors.js';
import { sendNewsletterWelcomeEmail } from '../services/email.service.js';

export async function subscribe(req, res) {
  const { email } = req.body;
  if (!email) throw new AppError('Email required', 400, 'VALIDATION_ERROR');

  let isNew = true;
  try {
    await Newsletter.create({ email });
  } catch (err) {
    if (err.code === 11000) {
      isNew = false;
      return res.json({ success: true, message: 'Already subscribed' });
    }
    throw err;
  }

  if (isNew) {
    try {
      await sendNewsletterWelcomeEmail(email);
    } catch {
      // non-blocking
    }
  }

  res.status(201).json({ success: true, message: 'Subscribed successfully' });
}
