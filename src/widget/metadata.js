/**
 * Collect browser/device metadata for the bug report.
 */

/**
 * @returns {{ browser: string, os: string, screenSize: string, url: string, timestamp: string }}
 */
export function collectMetadata() {
    const ua = navigator.userAgent;

    return {
        browser: detectBrowser(ua),
        os: detectOS(ua),
        screenSize: `${window.innerWidth}×${window.innerHeight} (${window.screen.width}×${window.screen.height} physical)`,
        url: window.location.href,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Parse a human-readable browser name from the UA string.
 */
function detectBrowser(ua) {
    if (ua.includes('Firefox/')) {
        const v = ua.match(/Firefox\/([\d.]+)/);
        return `Firefox ${v ? v[1] : ''}`;
    }
    if (ua.includes('Edg/')) {
        const v = ua.match(/Edg\/([\d.]+)/);
        return `Edge ${v ? v[1] : ''}`;
    }
    if (ua.includes('Chrome/') && !ua.includes('Edg/')) {
        const v = ua.match(/Chrome\/([\d.]+)/);
        return `Chrome ${v ? v[1] : ''}`;
    }
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) {
        const v = ua.match(/Version\/([\d.]+)/);
        return `Safari ${v ? v[1] : ''}`;
    }
    return ua;
}

/**
 * Parse a human-readable OS name from the UA string.
 */
function detectOS(ua) {
    if (ua.includes('Win')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('Android')) return 'Android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    return 'Unknown';
}
