/**
 * Screenshot capture module using html2canvas.
 * Takes a screenshot of the visible viewport and returns it as a data URL.
 */
import html2canvas from 'html2canvas';

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
        const canvas = await html2canvas(document.body, {
            useCORS: true,
            allowTaint: false,
            width: window.innerWidth,
            height: window.innerHeight,
            scrollX: -window.scrollX,
            scrollY: -window.scrollY,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            logging: false,
            scale: Math.min(window.devicePixelRatio, 2), // cap at 2x for perf
        });

        return canvas.toDataURL('image/png');
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
