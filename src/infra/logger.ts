import pino from 'pino';

let logger: pino.Logger;

export function initLogger(level: string = 'info'): pino.Logger {
  logger = pino({
    level,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'yyyy-mm-dd HH:MM:ss',
        ignore: 'pid,hostname',
      },
    },
  });
  return logger;
}

export function getLogger(): pino.Logger {
  if (!logger) {
    logger = pino({
      level: 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    });
  }
  return logger;
}

export const log = {
  info: (msg: string, data?: Record<string, unknown>) => getLogger().info(data || {}, msg),
  warn: (msg: string, data?: Record<string, unknown>) => getLogger().warn(data || {}, msg),
  error: (msg: string, data?: Record<string, unknown>) => getLogger().error(data || {}, msg),
  debug: (msg: string, data?: Record<string, unknown>) => getLogger().debug(data || {}, msg),
};
