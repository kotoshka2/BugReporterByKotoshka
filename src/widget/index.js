/**
 * Bug Report Widget — Entry Point
 *
 * Embeddable widget that lets users capture screenshots, add comments,
 * and send bug reports to the site owner's Telegram / Notion.
 *
 * API URL is injected at build time via VITE_API_URL env variable.
 *
 * Usage:
 *   <script src="https://cdn.example.com/widget.iife.js" defer></script>
 *   <script>
 *     window.BugWidgetConfig = {
 *       apiKey: 'brw_XXXXXXXXXXXX',
 *       position: 'bottom-right', // or 'bottom-left'
 *     };
 *   </script>
 */

import { captureScreenshot, cropScreenshot } from './screenshot.js';
import { showCropOverlay } from './crop.js';
import { collectMetadata } from './metadata.js';
import { submitReport } from './api.js';
import widgetStyles from './styles.css?inline';

// API URL injected at build time by Vite
const API_URL = import.meta.env.VITE_API_URL;

// ── Icons (inline SVG) ─────────────────────────────────

const ICON_BUG = `<svg viewBox="0 0 24 24"><path d="M8 2l1.88 1.88M16 2l-1.88 1.88"/><path d="M9 7.13v-1a3 3 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M5 11H3"/><path d="M21 11h-2"/><path d="M5 17H3"/><path d="M21 17h-2"/><path d="M12 7v13"/></svg>`;

const ICON_CAMERA = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

// ── Widget Class ────────────────────────────────────────

class BugReportWidget {
    constructor(config = {}) {
        this.config = {
            position: config.position || 'bottom-right',
            apiKey: config.apiKey || '',
            lang: config.lang || 'ru',
            ...config,
        };

        this.screenshotDataUrl = null;
        this.isOpen = false;

        this._init();
    }

    // ── Initialization ──

    _init() {
        // Create host element in the actual DOM
        this.host = document.createElement('div');
        this.host.id = 'bug-report-widget-host';
        this.shadow = this.host.attachShadow({ mode: 'open' });

        // Inject isolated styles
        const style = document.createElement('style');
        style.textContent = widgetStyles;
        this.shadow.appendChild(style);

        // Render trigger button
        this._renderTrigger();

        // Render modal (hidden)
        this._renderModal();

        // Render backdrop
        this._renderBackdrop();

        // Append to document body
        document.body.appendChild(this.host);
    }

    // ── Trigger Button ──

    _renderTrigger() {
        this.trigger = document.createElement('button');
        this.trigger.className = `brw-trigger brw-trigger--${this.config.position}`;
        this.trigger.innerHTML = ICON_BUG;
        this.trigger.setAttribute('aria-label', 'Report a bug');
        this.trigger.addEventListener('click', () => this.open());
        this.shadow.appendChild(this.trigger);
    }

    // ── Backdrop ──

    _renderBackdrop() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'brw-backdrop';
        this.backdrop.addEventListener('click', () => this.close());
        this.shadow.appendChild(this.backdrop);
    }

    // ── Modal ──

    _renderModal() {
        const metadata = collectMetadata();

        this.modal = document.createElement('div');
        this.modal.className = 'brw-modal';
        this.modal.innerHTML = `
      <div class="brw-modal__header">
        <span class="brw-modal__title">🐞 Сообщить о баге</span>
        <button class="brw-modal__close" aria-label="Close">✕</button>
      </div>
      <div class="brw-modal__body">
        <div class="brw-screenshot-area" id="brw-screenshot-area">
          <div class="brw-screenshot-area__placeholder">
            ${ICON_CAMERA}
            <span>Нажмите, чтобы сделать скриншот</span>
          </div>
        </div>
        <textarea class="brw-textarea" id="brw-comment" placeholder="Опишите проблему…" rows="3"></textarea>
        <div class="brw-meta">
          <div class="brw-meta__row"><span class="brw-meta__label">Browser:</span><span>${metadata.browser}</span></div>
          <div class="brw-meta__row"><span class="brw-meta__label">OS:</span><span>${metadata.os}</span></div>
          <div class="brw-meta__row"><span class="brw-meta__label">Screen:</span><span>${metadata.screenSize}</span></div>
          <div class="brw-meta__row"><span class="brw-meta__label">URL:</span><span style="word-break:break-all">${metadata.url}</span></div>
        </div>
      </div>
      <div class="brw-modal__footer">
        <button class="brw-btn brw-btn--ghost" id="brw-cancel">Отмена</button>
        <button class="brw-btn brw-btn--primary" id="brw-submit">
          Отправить
        </button>
      </div>
    `;

        // Attach event listeners
        this.modal.querySelector('.brw-modal__close').addEventListener('click', () => this.close());
        this.modal.querySelector('#brw-cancel').addEventListener('click', () => this.close());
        this.modal.querySelector('#brw-submit').addEventListener('click', () => this._submit());
        this.modal.querySelector('#brw-screenshot-area').addEventListener('click', () => this._startScreenshotCapture());

        this.shadow.appendChild(this.modal);
    }

    // ── Open / Close ──

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        // Refresh metadata each time modal opens
        this._refreshMetadata();

        this.backdrop.classList.add('brw-backdrop--visible');
        this.modal.classList.add('brw-modal--visible');
        this.trigger.style.display = 'none';
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this.backdrop.classList.remove('brw-backdrop--visible');
        this.modal.classList.remove('brw-modal--visible');
        this.trigger.style.display = '';

        // Reset state
        this._resetForm();
    }

    // ── Refresh Metadata ──

    _refreshMetadata() {
        const meta = collectMetadata();
        const metaEl = this.modal.querySelector('.brw-meta');
        if (metaEl) {
            metaEl.innerHTML = `
        <div class="brw-meta__row"><span class="brw-meta__label">Browser:</span><span>${meta.browser}</span></div>
        <div class="brw-meta__row"><span class="brw-meta__label">OS:</span><span>${meta.os}</span></div>
        <div class="brw-meta__row"><span class="brw-meta__label">Screen:</span><span>${meta.screenSize}</span></div>
        <div class="brw-meta__row"><span class="brw-meta__label">URL:</span><span style="word-break:break-all">${meta.url}</span></div>
      `;
        }
    }

    // ── Screenshot Capture ──

    async _startScreenshotCapture() {
        // Hide modal for clean screenshot
        this.modal.classList.remove('brw-modal--visible');
        this.backdrop.classList.remove('brw-backdrop--visible');

        // Wait for modal animation to complete
        await this._wait(350);

        // Show crop overlay
        const rect = await showCropOverlay(this.shadow);

        if (!rect) {
            // User cancelled, re-show modal
            this.modal.classList.add('brw-modal--visible');
            this.backdrop.classList.add('brw-backdrop--visible');
            return;
        }

        // Capture full screenshot
        const fullScreenshot = await captureScreenshot(this.host);

        // Crop to selected area
        const cropped = await cropScreenshot(fullScreenshot, rect);
        this.screenshotDataUrl = cropped;

        // Show preview in modal
        this._showScreenshotPreview(cropped);

        // Re-show modal
        this.modal.classList.add('brw-modal--visible');
        this.backdrop.classList.add('brw-backdrop--visible');
    }

    _showScreenshotPreview(dataUrl) {
        const area = this.modal.querySelector('#brw-screenshot-area');
        area.innerHTML = `<img src="${dataUrl}" alt="Screenshot preview" />`;
    }

    // ── Submit Report ──

    async _submit() {
        const comment = this.modal.querySelector('#brw-comment').value.trim();
        if (!comment && !this.screenshotDataUrl) {
            this._showToast('Добавьте комментарий или скриншот', 'error');
            return;
        }

        const submitBtn = this.modal.querySelector('#brw-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="brw-spinner"></span> Отправка…';

        try {
            const metadata = collectMetadata();
            await submitReport(API_URL, {
                comment,
                screenshot: this.screenshotDataUrl || null,
                metadata,
                apiKey: this.config.apiKey,
            });

            this.close();
            this._showToast('Баг-репорт отправлен! Спасибо 🎉', 'success');
        } catch (err) {
            console.error('[BugReportWidget] Submit failed:', err);
            this._showToast('Ошибка отправки. Попробуйте ещё раз.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Отправить';
        }
    }

    // ── Toast Notifications ──

    _showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `brw-toast brw-toast--${type}`;
        toast.textContent = message;
        this.shadow.appendChild(toast);

        // Auto-remove after animation completes
        setTimeout(() => toast.remove(), 3000);
    }

    // ── Helpers ──

    _resetForm() {
        const textarea = this.modal.querySelector('#brw-comment');
        if (textarea) textarea.value = '';

        this.screenshotDataUrl = null;

        const area = this.modal.querySelector('#brw-screenshot-area');
        if (area) {
            area.innerHTML = `
        <div class="brw-screenshot-area__placeholder">
          ${ICON_CAMERA}
          <span>Нажмите, чтобы сделать скриншот</span>
        </div>
      `;
        }
    }

    _wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}

// ── Auto-Init ──

function init() {
    const config = window.BugWidgetConfig || {};
    window.__bugReportWidget = new BugReportWidget(config);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export default BugReportWidget;
