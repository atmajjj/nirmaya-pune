import * as nodemailer from 'nodemailer';
import { validateEnv } from './validateEnv';

// Get validated environment variables
const env = validateEnv();

// Email configuration constants
export const EMAIL_SENDER = env.EMAIL_USER;
export const APP_NAME = env.APP_NAME;

/**
 * Create and configure nodemailer transporter
 * Uses Gmail SMTP for sending emails
 */
export const createTransporter = (): nodemailer.Transporter => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: env.EMAIL_USER,
      pass: env.EMAIL_PASSWORD,
    },
  });
};