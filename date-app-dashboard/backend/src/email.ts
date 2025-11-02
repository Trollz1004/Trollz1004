import nodemailer from 'nodemailer';
import logger from './logger';

const transporter = nodemailer.createTransport({
  host: process.env.ETHEREAL_HOST,
  port: parseInt(process.env.ETHEREAL_PORT as string),
  auth: {
    user: process.env.ETHEREAL_USER,
    pass: process.env.ETHEREAL_PASS,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const info = await transporter.sendMail({
      from: '"Date App DAO" <noreply@dateapp.dao>',
      to,
      subject,
      html,
    });

    logger.info(`Email sent: ${info.messageId}`);
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
  } catch (error) {
    logger.error('Error sending email:', error);
  }
};
