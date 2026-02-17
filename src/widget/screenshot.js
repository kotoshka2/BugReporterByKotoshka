/**
 * Screenshot capture module.
 *
 * Primary:  html2canvas (silent, works everywhere)
 * Optional: getDisplayMedia (pixel-perfect, requires user permission)
 */
import html2canvas from 'html2canvas';

/**
 * Capture the current visible viewport using html2canvas.
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
 * Capture pixel-perfect screenshot via native getDisplayMedia API.
 * Shows a browser permission dialog — user must select "This Tab".
 * @returns {Promise<string>} data URL of the screenshot (PNG).
 * @throws {Error} if user cancels or API is not supported.
 */
export async function captureNativeScreenshot() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        throw new Error('getDisplayMedia not supported');
    }

    const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'browser' },
        preferCurrentTab: true,
        audio: false,
    });

    try {
        const track = stream.getVideoTracks()[0];

        // Wait for the video track to have a non-zero frame
        const video = document.createElement('video');
        video.srcObject = stream;
        video.muted = true;

        await new Promise((resolve, reject) => {
            video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
            video.onerror = reject;
        });

        // Small delay to ensure the frame is rendered (fixes blank screenshots)
        await new Promise((r) => setTimeout(r, 150));

        // Draw the current frame to canvas
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0);

        return canvas.toDataURL('image/png');
    } finally {
        // Always stop the stream to remove the "sharing" indicator
        stream.getTracks().forEach((t) => t.stop());
    }
}

/**
 * Check if native screenshot (getDisplayMedia) is available.
 * @returns {boolean}
 */
export function isNativeScreenshotSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia);
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
