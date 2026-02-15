/**
 * Screenshot capture module using html-to-image.
 * Uses SVG foreignObject for high-fidelity rendering of modern CSS
 * (backdrop-filter, mix-blend-mode, gradients, etc.)
 */
import { toPng } from 'html-to-image';

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
        const dataUrl = await toPng(document.body, {
            width: window.innerWidth,
            height: window.innerHeight,
            canvasWidth: window.innerWidth * Math.min(window.devicePixelRatio, 2),
            canvasHeight: window.innerHeight * Math.min(window.devicePixelRatio, 2),
            pixelRatio: 1,
            skipAutoScale: true,
            cacheBust: false, // Fix: prevents appending timestamps to data-uris which causes 400 errors
            // Filter out the widget root even if display:none fails
            filter: (node) => {
                if (node === widgetRoot) return false;
                // Skip nodes that explicitly opt out
                if (node.dataset && node.dataset.htmlToImageIgnore) return false;
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
