/**
 * API client — sends the bug report payload to the backend API Gateway.
 */

/**
 * Submit the bug report.
 * @param {string} apiUrl — backend endpoint, e.g. https://your-worker.workers.dev/api/report
 * @param {{ comment: string, screenshot: string, metadata: object, apiKey?: string }} payload
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
export async function submitReport(apiUrl, payload) {
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text().catch(() => 'Unknown error');
        throw new Error(`API error (${response.status}): ${text}`);
    }

    return response.json();
}
