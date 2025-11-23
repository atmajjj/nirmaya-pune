import * as nodemailer from 'nodemailer';
import { config } from './validateEnv';

// Email configuration constants
export const EMAIL_SENDER = config.EMAIL_USER;
export const APP_NAME = config.APP_NAME;

/**
 * Create and configure nodemailer transporter
 * Uses Gmail SMTP for sending emails
 */
export const createTransporter = (): nodemailer.Transporter => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: config.EMAIL_USER,
      pass: config.EMAIL_PASSWORD,
    },
  });
};