/**
 * Quick Mirror - Logger
 * Crash logging system using electron-log
 */

const log = require('electron-log');
const path = require('path');
const { app, shell } = require('electron');

const LOGS_FOLDER = 'logs';

function initLogger() {
  const userDataPath = app.getPath('userData');
  const logsPath = path.join(userDataPath, LOGS_FOLDER);
  
  log.transports.file.resolvePathFn = () => path.join(logsPath, 'quick-mirror.log');
  log.transports.file.maxSize = 5 * 1024 * 1024;
  log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';
  log.transports.console.format = '[{h}:{i}:{s}] [{level}] {text}';
  
  log.transports.file.level = 'info';
  log.transports.console.level = 'debug';
  
  log.catchErrors({
    showDialog: false,
    onError: (error) => {
      log.error('Uncaught exception:', error);
    },
  });
  
  process.on('uncaughtException', (error) => {
    log.error('Uncaught Exception:', error);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  log.info('='.repeat(50));
  log.info('Quick Mirror started');
  log.info('Version:', app.getVersion());
  log.info('User data path:', userDataPath);
  log.info('Platform:', process.platform);
  log.info('='.repeat(50));
  
  return log;
}

function getLogPath() {
  return path.join(app.getPath('userData'), LOGS_FOLDER);
}

function openLogsFolder() {
  const logsPath = getLogPath();
  shell.openPath(logsPath).catch((err) => {
    log.error('Failed to open logs folder:', err);
  });
}

module.exports = {
  initLogger,
  getLogPath,
  openLogsFolder,
  log,
};
