const fs = require('fs');
const path = require('path');

const LOG_DIRS = [
  path.join(__dirname, 'logs'),
  path.join(__dirname, 'src', 'logs')
];

// Ensure directories exist
for (const dir of LOG_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const LOG_FILES = LOG_DIRS.map(dir => path.join(dir, 'issue_logs.txt'));

function formatTime() {
  const now = new Date();
  const pad = (n, width = 2) => String(n).padStart(width, '0');
  const yyyy = now.getFullYear();
  const mm = pad(now.getMonth() + 1);
  const dd = pad(now.getDate());
  const hh = pad(now.getHours());
  const min = pad(now.getMinutes());
  const ss = pad(now.getSeconds());
  const ms = pad(now.getMilliseconds(), 3);
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}.${ms}`;
}

function writeToLog(level, source, message, stack = '') {
  const timestamp = formatTime();
  let logLine = `[${timestamp}] [${level}] [${source}] ${message}`;
  if (stack) {
    logLine += `\r\nStack Trace:\r\n${stack}`;
  }
  logLine += '\r\n--------------------------------------------------------------------------------\r\n';

  // Write to both logs/ and src/logs/
  for (const logPath of LOG_FILES) {
    try {
      fs.appendFileSync(logPath, logLine, 'utf-8');
    } catch (err) {
      process.stderr.write(`Failed to write to log file ${logPath}: ${err}\n`);
    }
  }
}

// Global exception hooks
function initLogger() {
  writeToLog('INFO', 'SYSTEM', 'Issue logger initialized.');

  // Catch uncaught exceptions in Node/Electron main process
  process.on('uncaughtException', (err) => {
    writeToLog('FATAL', 'MAIN_PROCESS', err ? (err.message || String(err)) : 'Unknown exception', err ? err.stack : '');
  });

  // Catch unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    const msg = reason ? (reason.message || String(reason)) : 'Unhandled rejection';
    const stack = reason && reason.stack ? reason.stack : '';
    writeToLog('ERROR', 'PROMISE', msg, stack);
  });

  // Intercept console.error
  const originalConsoleError = console.error;
  console.error = function (...args) {
    originalConsoleError.apply(console, args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
    writeToLog('ERROR', 'CONSOLE', msg);
  };

  // Intercept console.warn
  const originalConsoleWarn = console.warn;
  console.warn = function (...args) {
    originalConsoleWarn.apply(console, args);
    const msg = args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ');
    writeToLog('WARN', 'CONSOLE', msg);
  };
}

module.exports = {
  initLogger,
  writeToLog,
  LOG_FILES
};
