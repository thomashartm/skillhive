import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import { utilities as nestWinstonModuleUtilities, WinstonModule } from 'nest-winston';

const logsDir = path.join(process.cwd(), 'logs');

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.ms(),
  nestWinstonModuleUtilities.format.nestLike('SkillHive API', {
    colors: true,
    prettyPrint: true,
  })
);

// File format for structured logging
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Daily rotate file transport for all logs
const allLogsTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: 'app-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
  level: 'debug',
});

// Daily rotate file transport for errors only
const errorLogsTransport = new DailyRotateFile({
  dirname: logsDir,
  filename: 'error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
  level: 'error',
});

// Console transport for development
const consoleTransport = new winston.transports.Console({
  format: consoleFormat,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
});

export const loggerConfig = {
  transports: [
    consoleTransport,
    allLogsTransport,
    errorLogsTransport,
  ],
};

export const logger = WinstonModule.createLogger(loggerConfig);
