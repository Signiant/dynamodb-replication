const logMetric = (tableName, context, args) => console.log('[METRIC]', '[' + tableName + ']', context,  ...args);

const metricsLogger = (tableName) => ({
    all: (...args) => logMetric(tableName, 'ALL', args),
    table: (...args) => logMetric(tableName, 'TABLE', args),
    total: (...args) => logMetric(tableName, 'TOTAL', args),
    none: (...args) => logMetric(tableName, 'NONE', args)
});

const prefixLogger = (prefix) => ({
    log: (...args) => levelLogger.log(`[${prefix}]`, ...args),
    info: (...args) => levelLogger.info(`[${prefix}]`, ...args),
    warn: (...args) => levelLogger.warn(`[${prefix}]`, ...args),
    error: (...args) => levelLogger.error(`[${prefix}]`, ...args),
});

const levelLogger = {
    log: (...args) => console.log( '[LOG]', ...args),
    info: (...args) => console.log( '[INFO]', ...args),
    warn: (...args) => console.log( '[WARN]', ...args),
    error: (...args) => console.log( '[ERROR]', ...args),
}

module.exports = {
    metricsLogger,
    prefixLogger,
    levelLogger
};
