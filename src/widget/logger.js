/**
 * Console Log Interceptor
 *
 * Captures console output (log, warn, error, info) into a circular buffer
 * so it can be attached to bug reports for debugging context.
 *
 * Call initLogger() as early as possible to start capturing.
 * Call getLogs() to retrieve the captured entries.
 */

const MAX_ENTRIES = 50;
const CAPTURED_LEVELS = ['log', 'warn', 'error', 'info'];

/** @type {Array<{ level: string, message: string, timestamp: string }>} */
const logBuffer = [];

/** Original console methods (preserved so we can still call them). */
const originals = {};

let initialized = false;

/**
 * Safely convert any value to a short string representation.
 * Handles objects, Errors, circular references, and primitives.
 */
function safeStringify(value) {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';

    if (value instanceof Error) {
        return `${value.name}: ${value.message}`;
    }

    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return String(value);
        }
    }

    return String(value);
}

/**
 * Start intercepting console methods.
 * Safe to call multiple times — only installs once.
 */
export function initLogger() {
    if (initialized) return;
    initialized = true;

    for (const level of CAPTURED_LEVELS) {
        originals[level] = console[level];

        console[level] = (...args) => {
            // Build a single message string from all arguments
            const message = args.map(safeStringify).join(' ');

            // Push into circular buffer
            logBuffer.push({
                level,
                message: message.slice(0, 1000), // cap individual message length
                timestamp: new Date().toISOString(),
            });

            // Trim buffer if it exceeds the limit
            if (logBuffer.length > MAX_ENTRIES) {
                logBuffer.splice(0, logBuffer.length - MAX_ENTRIES);
            }

            // Call the original console method so DevTools still works
            originals[level].apply(console, args);
        };
    }

    // Also capture unhandled errors and promise rejections
    if (typeof window !== 'undefined') {
        window.addEventListener('error', (event) => {
            logBuffer.push({
                level: 'error',
                message: `[Uncaught] ${event.message} at ${event.filename}:${event.lineno}:${event.colno}`,
                timestamp: new Date().toISOString(),
            });
            if (logBuffer.length > MAX_ENTRIES) {
                logBuffer.splice(0, logBuffer.length - MAX_ENTRIES);
            }
        });

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason instanceof Error
                ? `${event.reason.name}: ${event.reason.message}`
                : safeStringify(event.reason);
            logBuffer.push({
                level: 'error',
                message: `[UnhandledRejection] ${reason}`,
                timestamp: new Date().toISOString(),
            });
            if (logBuffer.length > MAX_ENTRIES) {
                logBuffer.splice(0, logBuffer.length - MAX_ENTRIES);
            }
        });
    }
}

/**
 * Get all captured log entries.
 * @returns {Array<{ level: string, message: string, timestamp: string }>}
 */
export function getLogs() {
    return [...logBuffer];
}
