/**
 * Errora Widget — Entry Point
 *
 * Embeddable widget that lets users capture screenshots, add comments,
 * and send bug reports to the site owner's Telegram / Notion.
 *
 * API URL is injected at build time via VITE_API_URL env variable.
 *
 * Usage:
 *   <script src="https://cdn.example.com/errora-widget.iife.js" defer></script>
 *   <script>
 *     window.ErroraWidgetConfig = {
 *       apiKey: 'brw_XXXXXXXXXXXX',
 *       position: 'bottom-right', // or 'bottom-left'
 *       mode: 'public',           // 'public' (default) or 'restricted'
 *       secretHash: '...',        // SHA-256 hash of the secret (required when mode='restricted')
 *     };
 *   </script>
 *
 * Restricted mode:
 *   When mode='restricted', the widget is hidden unless the user visits
 *   the page with ?brw_secret=<password>. The password is hashed and
 *   compared against secretHash. On match, access is persisted in localStorage.
 *   Changing secretHash in config revokes all previous access.
 */

import { captureScreenshot, cropScreenshot } from './screenshot.js';
import { showCropOverlay } from './crop.js';
import { collectMetadata } from './metadata.js';
import { submitReport } from './api.js';
import { initLogger, getLogs } from './logger.js';
import widgetStyles from './styles.css?inline';

// Start capturing console logs as early as possible
initLogger();

// API URL injected at build time by Vite
const API_URL = import.meta.env.VITE_API_URL;

// ── Access Control Helpers ──────────────────────────────

const BRW_STORAGE_KEY = 'errora_access_token';

/**
 * Compute SHA-256 hex digest of a string.
 * Uses the native Web Crypto API (available in all modern browsers).
 */
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if the user has access in 'restricted' mode.
 *
 * 1. Check URL for ?brw_secret=<password>  → hash & compare → persist.
 * 2. Check localStorage for a previously stored token → hash & compare.
 * 3. If secretHash changed in config, stored tokens become invalid.
 *
 * @param {string} secretHash - SHA-256 hex hash of the secret password.
 * @returns {Promise<boolean>} true if access is granted.
 */
async function checkAccess(secretHash) {
    // 1. Check URL parameter
    const params = new URLSearchParams(window.location.search);
    const urlSecret = params.get('errora_secret');

    if (urlSecret) {
        const hash = await sha256(urlSecret);
        if (hash === secretHash) {
            // Persist the plain token so user stays authorized
            try {
                localStorage.setItem(BRW_STORAGE_KEY, urlSecret);
            } catch (_) { /* localStorage may be unavailable */ }

            // Clean URL (remove brw_secret param) to avoid sharing
            const url = new URL(window.location);
            url.searchParams.delete('errora_secret');
            window.history.replaceState({}, '', url);

            return true;
        }
    }

    // 2. Check localStorage for previously stored token
    try {
        const storedToken = localStorage.getItem(BRW_STORAGE_KEY);
        if (storedToken) {
            const hash = await sha256(storedToken);
            if (hash === secretHash) {
                return true;
            }
            // Hash mismatch → secret was rotated, clear old token
            localStorage.removeItem(BRW_STORAGE_KEY);
        }
    } catch (_) { /* localStorage may be unavailable */ }

    return false;
}

// ── Icons (inline SVG) ─────────────────────────────────

const ICON_BUG = `<svg viewBox="0 0 24 24"><path d="M8 2l1.88 1.88M16 2l-1.88 1.88"/><path d="M9 7.13v-1a3 3 0 0 1 6 0v1"/><path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6z"/><path d="M5 11H3"/><path d="M21 11h-2"/><path d="M5 17H3"/><path d="M21 17h-2"/><path d="M12 7v13"/></svg>`;

const ICON_CAMERA = `<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

// ── Widget Class ────────────────────────────────────────

class ErroraWidget {
    constructor(config = {}) {
        this.config = {
            position: config.position || 'bottom-right',
            apiKey: config.apiKey || '',
            lang: config.lang || 'ru',
            mode: config.mode || 'public',
            secretHash: config.secretHash || '',
            ...config,
        };

        this.screenshotDataUrl = null;
        this.isOpen = false;

        // Defer initialization: for 'restricted' mode we need
        // an async access check before rendering anything.
        this._boot();
    }

    // ── Boot (async access gate) ──

    async _boot() {
        try {
            // Fetch visibility settings from backend
            const resp = await fetch(`${API_URL.replace('/api/report', '')}/api/config?apiKey=${encodeURIComponent(this.config.apiKey)}`);
            if (resp.ok) {
                const serverConfig = await resp.json();
                this.config.mode = serverConfig.mode || 'public';
                this.config.secretHash = serverConfig.secretHash || '';
            } else {
                console.warn('[ErroraWidget] Failed to fetch config, defaulting to public mode.');
            }
        } catch (err) {
            console.warn('[ErroraWidget] Config fetch error, defaulting to public mode:', err.message);
        }

        // Apply access control
        if (this.config.mode === 'restricted') {
            if (!this.config.secretHash) {
                console.warn('[ErroraWidget] mode="restricted" but no secretHash configured. Widget disabled.');
                return;
            }
            const hasAccess = await checkAccess(this.config.secretHash);
            if (!hasAccess) {
                // User is not authorized — do not render widget
                return;
            }
        }

        this._init();
    }

    // ── Initialization ──

    _init() {
        // Create host element in the actual DOM
        this.host = document.createElement('div');
        this.host.id = 'errora-widget-host';
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
        this.trigger.className = `errora-trigger errora-trigger--${this.config.position}`;
        this.trigger.innerHTML = ICON_BUG;
        this.trigger.setAttribute('aria-label', 'Report a bug');
        this.trigger.addEventListener('click', () => this.open());
        this.shadow.appendChild(this.trigger);
    }

    // ── Backdrop ──

    _renderBackdrop() {
        this.backdrop = document.createElement('div');
        this.backdrop.className = 'errora-backdrop';
        this.backdrop.addEventListener('click', () => this.close());
        this.shadow.appendChild(this.backdrop);
    }

    // ── Modal ──

    _renderModal() {
        const metadata = collectMetadata();

        this.modal = document.createElement('div');
        this.modal.className = 'errora-modal';
        this.modal.innerHTML = `
      <div class="errora-modal__header">
        <span class="errora-modal__title">🐞 Errora</span>
        <button class="errora-modal__close" aria-label="Close">✕</button>
      </div>
      <div class="errora-modal__body">
        <div class="errora-screenshot-area" id="errora-screenshot-area">
          <div class="errora-screenshot-area__placeholder">
            ${ICON_CAMERA}
            <span>Нажмите, чтобы сделать скриншот</span>
          </div>
        </div>
        <textarea class="errora-textarea" id="errora-comment" placeholder="Опишите проблему…" rows="3"></textarea>
        <div class="errora-meta">
          <div class="errora-meta__row"><span class="errora-meta__label">Browser:</span><span>${metadata.browser}</span></div>
          <div class="errora-meta__row"><span class="errora-meta__label">OS:</span><span>${metadata.os}</span></div>
          <div class="errora-meta__row"><span class="errora-meta__label">Screen:</span><span>${metadata.screenSize}</span></div>
          <div class="errora-meta__row"><span class="errora-meta__label">URL:</span><span style="word-break:break-all">${metadata.url}</span></div>
        </div>
      </div>
      <div class="errora-modal__footer">
        <button class="errora-btn errora-btn--ghost" id="errora-cancel">Отмена</button>
        <button class="errora-btn errora-btn--primary" id="errora-submit">
          Отправить
        </button>
      </div>
    `;

        // Attach event listeners
        this.modal.querySelector('.errora-modal__close').addEventListener('click', () => this.close());
        this.modal.querySelector('#errora-cancel').addEventListener('click', () => this.close());
        this.modal.querySelector('#errora-submit').addEventListener('click', () => this._submit());
        this.modal.querySelector('#errora-screenshot-area').addEventListener('click', () => this._startScreenshotCapture());

        this.shadow.appendChild(this.modal);
    }

    // ── Open / Close ──

    open() {
        if (this.isOpen) return;
        this.isOpen = true;

        // Refresh metadata each time modal opens
        this._refreshMetadata();

        this.backdrop.classList.add('errora-backdrop--visible');
        this.modal.classList.add('errora-modal--visible');
        this.trigger.style.display = 'none';
    }

    close() {
        if (!this.isOpen) return;
        this.isOpen = false;

        this.backdrop.classList.remove('errora-backdrop--visible');
        this.modal.classList.remove('errora-modal--visible');
        this.trigger.style.display = '';

        // Reset state
        this._resetForm();
    }

    // ── Refresh Metadata ──

    _refreshMetadata() {
        const meta = collectMetadata();
        const metaEl = this.modal.querySelector('.errora-meta');
        if (metaEl) {
            metaEl.innerHTML = `
        <div class="errora-meta__row"><span class="errora-meta__label">Browser:</span><span>${meta.browser}</span></div>
        <div class="errora-meta__row"><span class="errora-meta__label">OS:</span><span>${meta.os}</span></div>
        <div class="errora-meta__row"><span class="errora-meta__label">Screen:</span><span>${meta.screenSize}</span></div>
        <div class="errora-meta__row"><span class="errora-meta__label">URL:</span><span style="word-break:break-all">${meta.url}</span></div>
      `;
        }
    }

    // ── Screenshot Capture ──

    async _startScreenshotCapture() {
        // Hide modal for clean screenshot
        this.modal.classList.remove('errora-modal--visible');
        this.backdrop.classList.remove('errora-backdrop--visible');

        // Wait for modal animation to complete
        await this._wait(350);

        // Show crop overlay
        const rect = await showCropOverlay(this.shadow);

        if (!rect) {
            // User cancelled, re-show modal
            this.modal.classList.add('errora-modal--visible');
            this.backdrop.classList.add('errora-backdrop--visible');
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
        this.modal.classList.add('errora-modal--visible');
        this.backdrop.classList.add('errora-backdrop--visible');
    }

    _showScreenshotPreview(dataUrl) {
        const area = this.modal.querySelector('#errora-screenshot-area');
        area.innerHTML = `<img src="${dataUrl}" alt="Screenshot preview" />`;
    }

    // ── Submit Report ──

    async _submit() {
        const comment = this.modal.querySelector('#errora-comment').value.trim();
        if (!comment && !this.screenshotDataUrl) {
            this._showToast('Добавьте комментарий или скриншот', 'error');
            return;
        }

        const submitBtn = this.modal.querySelector('#errora-submit');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="errora-spinner"></span> Отправка…';

        try {
            const metadata = collectMetadata();
            await submitReport(API_URL, {
                comment,
                screenshot: this.screenshotDataUrl || null,
                metadata,
                consoleLogs: getLogs(),
                apiKey: this.config.apiKey,
            });

            this.close();
            this._showToast('Баг-репорт отправлен! Спасибо 🎉', 'success');
        } catch (err) {
            console.error('[ErroraWidget] Submit failed:', err);
            this._showToast('Ошибка отправки. Попробуйте ещё раз.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Отправить';
        }
    }

    // ── Toast Notifications ──

    _showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `errora-toast errora-toast--${type}`;
        toast.textContent = message;
        this.shadow.appendChild(toast);

        // Auto-remove after animation completes
        setTimeout(() => toast.remove(), 3000);
    }

    // ── Helpers ──

    _resetForm() {
        const textarea = this.modal.querySelector('#errora-comment');
        if (textarea) textarea.value = '';

        this.screenshotDataUrl = null;

        const area = this.modal.querySelector('#errora-screenshot-area');
        if (area) {
            area.innerHTML = `
        <div class="errora-screenshot-area__placeholder">
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
    const config = window.ErroraWidgetConfig || {};
    window.__erroraWidget = new ErroraWidget(config);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

export default ErroraWidget;
