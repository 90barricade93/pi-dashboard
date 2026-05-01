export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function normalizeLevel(input?: string): LogLevel {
  const v = (input || '').toLowerCase();
  return (['debug', 'info', 'warn', 'error'] as const).includes(v as LogLevel)
    ? (v as LogLevel)
    : 'info';
}

const CURRENT_LEVEL: LogLevel = normalizeLevel(process.env['LOG_LEVEL']);

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[CURRENT_LEVEL];
}

function emit(level: LogLevel, msg: string, fields?: Record<string, unknown>) {
  const rec = {
    level,
    msg,
    time: new Date().toISOString(),
    ...fields,
  } as const;
  const line = JSON.stringify(rec);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.warn(line);
  }
}

export type Logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => void;
  info: (msg: string, fields?: Record<string, unknown>) => void;
  warn: (msg: string, fields?: Record<string, unknown>) => void;
  error: (msg: string, fields?: Record<string, unknown>) => void;
  child: (context: Record<string, unknown>) => Logger;
};

export function getLogger(baseContext: Record<string, unknown> = {}): Logger {
  const base = { service: 'pi-dashboard', ...baseContext };

  return {
    debug: (msg, fields) => shouldLog('debug') && emit('debug', msg, { ...base, ...fields }),
    info: (msg, fields) => shouldLog('info') && emit('info', msg, { ...base, ...fields }),
    warn: (msg, fields) => shouldLog('warn') && emit('warn', msg, { ...base, ...fields }),
    error: (msg, fields) => shouldLog('error') && emit('error', msg, { ...base, ...fields }),
    child: context => getLogger({ ...base, ...context }),
  };
}

export const logger: Logger = getLogger();
