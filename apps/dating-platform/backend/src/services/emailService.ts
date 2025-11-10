import nodemailer, { Transporter } from 'nodemailer';
import logger from '../logger';
import config from '../config';

let transporter: Transporter | null = null;

const isConfigured = Boolean(
  config.email.host &&
  config.email.port &&
  config.email.user &&
  config.email.password &&
  config.email.from
);

if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: (config.email.port ?? 0) === 465,
    auth: {
      user: config.email.user,
      pass: config.email.password,
    },
  });

  transporter.verify().catch((error) => {
    logger.error('SMTP verification failed', { error: error.message });
  });
} else {
  logger.warn('Email service is not fully configured; transactional emails will not be sent');
}

const sendMail = async (options: { to: string; subject: string; text: string }) => {
  if (!transporter || !isConfigured) {
    logger.warn('Skipping email send due to missing configuration', {
      subject: options.subject,
    });
    return;
  }

  await transporter.sendMail({
    from: config.email.from,
    to: options.to,
    subject: options.subject,
    text: options.text,
  });
};

export const sendVerificationEmail = async (to: string, code: string) => {
  await sendMail({
    to,
    subject: 'Your Anti-AI Dating verification code',
    text: `Your verification code is ${code}. It expires in 15 minutes.`,
  });
};

export const sendNewDeviceAlertEmail = async (to: string, details: { ipAddress?: string; userAgent?: string; timestamp?: Date }) => {
  const { ipAddress, userAgent, timestamp } = details;
  const formattedTimestamp = timestamp ? timestamp.toISOString() : new Date().toISOString();
  await sendMail({
    to,
    subject: 'We detected a new login to your account',
    text: `Hello,

We noticed a new login to your account.

IP Address: ${ipAddress ?? 'Unknown'}
Device: ${userAgent ?? 'Unknown device'}
Time: ${formattedTimestamp}

If this was you, no action is needed. If you do not recognize this activity, please reset your password immediately and contact support.

Stay safe,
The Anti-AI Dating Team`,
  });
};

export const sendAccountLockedEmail = async (to: string, unlockTime: Date) => {
  await sendMail({
    to,
    subject: 'Your account has been temporarily locked',
    text: `Hello,

Due to multiple unsuccessful login attempts, we temporarily locked your account to keep it safe.

Lock expires at: ${unlockTime.toISOString()}

If this was not you, please reset your password once the lock expires or contact support for help.

Stay safe,
The Anti-AI Dating Team`,
  });
};

export const sendPasswordChangedEmail = async (to: string) => {
  await sendMail({
    to,
    subject: 'Your password was changed',
    text: `Hello,

This is a confirmation that your password has been changed.

If you did not perform this action, please reset your password immediately and contact support.

Stay safe,
The Anti-AI Dating Team`,
  });
};
