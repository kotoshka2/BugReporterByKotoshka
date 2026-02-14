/**
 * Crop overlay — lets the user draw a rectangle on the screen.
 * Returns the selected rectangle { x, y, width, height } or null if cancelled.
 */

/**
 * Show the crop overlay and let the user select a region.
 * @param {ShadowRoot} shadowRoot — shadow root to attach elements inside.
 * @returns {Promise<{x: number, y: number, width: number, height: number}|null>}
 */
export function showCropOverlay(shadowRoot) {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'brw-crop-overlay';

        const hint = document.createElement('div');
        hint.className = 'brw-crop-overlay__hint';
        hint.textContent = 'Выделите область экрана для скриншота. ESC — отмена.';
        overlay.appendChild(hint);

        const selection = document.createElement('div');
        selection.className = 'brw-crop-overlay__selection';
        selection.style.display = 'none';
        overlay.appendChild(selection);

        let startX = 0, startY = 0;
        let isDrawing = false;

        const cleanup = () => {
            overlay.removeEventListener('mousedown', onMouseDown);
            overlay.removeEventListener('mousemove', onMouseMove);
            overlay.removeEventListener('mouseup', onMouseUp);
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
        };

        const onMouseDown = (e) => {
            isDrawing = true;
            startX = e.clientX;
            startY = e.clientY;
            selection.style.left = `${startX}px`;
            selection.style.top = `${startY}px`;
            selection.style.width = '0px';
            selection.style.height = '0px';
            selection.style.display = 'block';
        };

        const onMouseMove = (e) => {
            if (!isDrawing) return;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const w = Math.abs(currentX - startX);
            const h = Math.abs(currentY - startY);
            selection.style.left = `${x}px`;
            selection.style.top = `${y}px`;
            selection.style.width = `${w}px`;
            selection.style.height = `${h}px`;
        };

        const onMouseUp = (e) => {
            if (!isDrawing) return;
            isDrawing = false;
            const currentX = e.clientX;
            const currentY = e.clientY;
            const x = Math.min(startX, currentX);
            const y = Math.min(startY, currentY);
            const w = Math.abs(currentX - startX);
            const h = Math.abs(currentY - startY);

            cleanup();

            // Ignore too small selections (accidental clicks)
            if (w < 10 || h < 10) {
                resolve(null);
                return;
            }

            resolve({ x, y, width: w, height: h });
        };

        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                resolve(null);
            }
        };

        overlay.addEventListener('mousedown', onMouseDown);
        overlay.addEventListener('mousemove', onMouseMove);
        overlay.addEventListener('mouseup', onMouseUp);
        document.addEventListener('keydown', onKeyDown);

        shadowRoot.appendChild(overlay);
    });
}
