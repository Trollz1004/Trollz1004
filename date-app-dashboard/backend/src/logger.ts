import winston from 'winston';
import config from './config';
import { getRequestId } from './utils/requestContext';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const requestIdFormat = winston.format((info) => {
  const requestId = info.requestId ?? getRequestId();
  if (requestId) {
    info.requestId = requestId;
  }
  return info;
});

const consoleFormat = config.env === 'production'
  ? combine(requestIdFormat(), timestamp(), errors({ stack: true }), json())
  : combine(
      requestIdFormat(),
      colorize(),
      timestamp(),
      errors({ stack: true }),
      printf((info) => {
        const requestId = info.requestId ? `[${info.requestId}] ` : '';
        const stack = info.stack ? `\n${info.stack}` : '';
        return `${info.timestamp} ${info.level}: ${requestId}${info.message}${stack}`;
      })
    );

const logger = winston.createLogger({
  level: config.logLevel,
  format: combine(requestIdFormat(), timestamp(), errors({ stack: true }), json()),
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

export default logger;
