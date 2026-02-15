/**
 * Screenshot capture module using html-to-image.
 * Pre-fetches external stylesheets to avoid CORS/SecurityError issues.
 */
import { toPng } from 'html-to-image';

/**
 * Fetch all external stylesheets and return their combined CSS text.
 * Silently skips any sheets that fail to load.
 * @returns {Promise<{ css: string, hrefs: string[] }>}
 */
async function prefetchStyles() {
    const links = document.querySelectorAll('link[rel="stylesheet"]');
    const hrefs = [];
    const fetches = [];

    links.forEach((link) => {
        const href = link.href;
        if (!href) return;
        hrefs.push(href);
        fetches.push(
            fetch(href)
                .then((r) => (r.ok ? r.text() : ''))
                .catch(() => '')
        );
    });

    const results = await Promise.all(fetches);
    return { css: results.join('\n'), hrefs };
}

/**
 * Capture the current visible viewport.
 * @param {HTMLElement} [widgetRoot] — widget root to temporarily hide during capture.
 * @returns {Promise<string>} data URL of the screenshot (PNG).
 */
export async function captureScreenshot(widgetRoot) {
    // Temporarily hide the widget so it doesn't appear in the screenshot
    if (widgetRoot) {
        widgetRoot.style.display = 'none';
    }

    try {
        // Pre-fetch external CSS to avoid SecurityError on cssRules
        const { css, hrefs } = await prefetchStyles();

        const dataUrl = await toPng(document.body, {
            width: window.innerWidth,
            height: window.innerHeight,
            canvasWidth: window.innerWidth * Math.min(window.devicePixelRatio, 2),
            canvasHeight: window.innerHeight * Math.min(window.devicePixelRatio, 2),
            pixelRatio: 1,
            skipAutoScale: true,
            cacheBust: false,
            // Provide pre-fetched CSS so the library doesn't try to read cssRules
            fontEmbedCSS: css,
            filter: (node) => {
                if (node === widgetRoot) return false;
                if (node.dataset && node.dataset.htmlToImageIgnore) return false;
                // Remove external <link> stylesheets from the clone
                // (we already inlined their content via fontEmbedCSS)
                if (
                    node.tagName === 'LINK' &&
                    node.rel === 'stylesheet' &&
                    hrefs.includes(node.href)
                ) {
                    return false;
                }
                return true;
            },
        });

        return dataUrl;
    } finally {
        // Restore widget visibility
        if (widgetRoot) {
            widgetRoot.style.display = '';
        }
    }
}

/**
 * Crop a region from a full screenshot data URL.
 * @param {string} fullDataUrl — the full screenshot as data URL.
 * @param {{ x: number, y: number, width: number, height: number }} rect — crop rect in CSS pixels.
 * @returns {Promise<string>} cropped image as data URL (PNG).
 */
export function cropScreenshot(fullDataUrl, rect) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const scale = img.naturalWidth / window.innerWidth;
            const canvas = document.createElement('canvas');
            canvas.width = rect.width * scale;
            canvas.height = rect.height * scale;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(
                img,
                rect.x * scale,
                rect.y * scale,
                rect.width * scale,
                rect.height * scale,
                0,
                0,
                canvas.width,
                canvas.height
            );
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = fullDataUrl;
    });
}
