import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';

const SEVERITY_WEIGHT = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};

export default function ReportsPage({ client }) {
    const { t, i18n } = useTranslation();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    // Filter and Sort States
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [sortBy, setSortBy] = useState('date_desc');

    // Reply Modal States
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [replyingReport, setReplyingReport] = useState(null);
    const [isReplying, setIsReplying] = useState(false);
    const [replyResult, setReplyResult] = useState(null);

    useEffect(() => {
        if (client) fetchReports();
    }, [client]);

    const fetchReports = async () => {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(500);

        if (error) {
            console.error('Failed to fetch reports:', error);
        }
        setReports(data || []);
        setLoading(false);
    };

    const getProcessedReports = () => {
        let processed = [...reports];

        // Filtering
        if (filterSeverity !== 'all') {
            processed = processed.filter(r => r.severity === filterSeverity);
        }

        // Sorting
        processed.sort((a, b) => {
            if (sortBy === 'date_desc') {
                return new Date(b.created_at) - new Date(a.created_at);
            }
            if (sortBy === 'date_asc') {
                return new Date(a.created_at) - new Date(b.created_at);
            }
            if (sortBy === 'severity_desc') {
                const weightA = SEVERITY_WEIGHT[a.severity] || 0;
                const weightB = SEVERITY_WEIGHT[b.severity] || 0;
                if (weightA !== weightB) {
                    return weightB - weightA;
                }
                return new Date(b.created_at) - new Date(a.created_at);
            }
            return 0;
        });

        return processed;
    };

    const handleOpenReply = (report, e) => {
        e.stopPropagation();
        setReplyingReport(report);
        setReplyMessage('');
        setReplyResult(null);
        setIsReplyModalOpen(true);
    };

    const handleCloseReply = () => {
        setIsReplyModalOpen(false);
        setReplyingReport(null);
        setReplyMessage('');
    };

    const handleSendReply = async () => {
        if (!replyMessage.trim()) return;
        setIsReplying(true);
        setReplyResult(null);

        try {
            const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api/report', '');
            const resp = await fetch(`${apiBaseUrl}/api/reply`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: client.api_key,
                    reportId: replyingReport.id,
                    message: replyMessage,
                }),
            });

            if (resp.ok) {
                setReplyResult({ type: 'success', msg: t('reports.reply_success', 'Reply sent successfully!') });
                setTimeout(() => {
                    handleCloseReply();
                }, 2000);
            } else {
                const data = await resp.json();
                setReplyResult({ type: 'error', msg: data.error || t('reports.reply_error', 'Failed to send reply') });
            }
        } catch (err) {
            setReplyResult({ type: 'error', msg: t('reports.reply_error', 'Failed to send reply') });
        }
        setIsReplying(false);
    };

    if (loading) {
        return (
            <div className="page">
                <h1 className="page__title">{t('dashboard.title_reports')}</h1>
                <div className="loading-spinner" />
            </div>
        );
    }

    const processedReports = getProcessedReports();

    return (
        <div className="page">
            <h1 className="page__title">
                {t('dashboard.title_reports')}
                <span className="badge">{reports.length}</span>
            </h1>

            {reports.length > 0 && (
                <div className="reports-controls">
                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                        <option value="all">{t('reports.filter_all', 'All')}</option>
                        <option value="critical">{t('reports.badge_critical', 'Critical')}</option>
                        <option value="high">{t('reports.badge_high', 'High')}</option>
                        <option value="medium">{t('reports.badge_medium', 'Medium')}</option>
                        <option value="low">{t('reports.badge_low', 'Low')}</option>
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <option value="date_desc">{t('reports.sort_date_desc', 'Newest first')}</option>
                        <option value="date_asc">{t('reports.sort_date_asc', 'Oldest first')}</option>
                        <option value="severity_desc">{t('reports.sort_severity_desc', 'Most severe first')}</option>
                    </select>
                </div>
            )}

            {processedReports.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state__icon">📭</span>
                    <h3>{t('reports.empty_title')}</h3>
                    <p>{t('reports.empty_desc')}</p>
                </div>
            ) : (
                <div className="reports-grid">
                    {processedReports.map((report) => (
                        <div
                            key={report.id}
                            className={`report-card ${selectedReport?.id === report.id ? 'report-card--selected' : ''}`}
                            onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                        >
                            <div className="report-card__header">
                                <span className="report-card__time">
                                    {new Date(report.created_at).toLocaleString((i18n.language || 'en').includes('ru') ? 'ru-RU' : 'en-US')}
                                </span>
                                <div className="report-card__badges">
                                    {report.severity && (
                                        <span className={`badge badge--severity-${report.severity}`}>
                                            {t(`reports.badge_${report.severity}`, report.severity)}
                                        </span>
                                    )}
                                    {report.tg_sent && <span className="badge badge--green">TG ✓</span>}
                                    {report.notion_sent && <span className="badge badge--blue">Notion ✓</span>}
                                </div>
                            </div>

                            <p className="report-card__comment">
                                {report.comment || t('reports.no_comment')}
                            </p>

                            {selectedReport?.id === report.id && (
                                <div className="report-card__details">
                                    {report.screenshot_url && (
                                        <a href={report.screenshot_url} target="_blank" rel="noopener">
                                            <img src={report.screenshot_url} alt="Screenshot" className="report-card__screenshot" />
                                        </a>
                                    )}
                                    <div className="report-card__meta">
                                        <div><strong>{t('reports.meta_url')}:</strong> {report.page_url || '—'}</div>
                                        <div><strong>{t('reports.meta_browser')}:</strong> {report.browser || '—'}</div>
                                        <div><strong>{t('reports.meta_os')}:</strong> {report.os || '—'}</div>
                                        <div><strong>{t('reports.meta_screen')}:</strong> {report.screen_size || '—'}</div>
                                        {report.reporter_email && (
                                            <div className="report-card__email-row">
                                                <span>
                                                    <strong>{t('auth.label_email', 'Email')}:</strong> {report.reporter_email}
                                                </span>
                                                <button
                                                    className="btn--reply"
                                                    onClick={(e) => handleOpenReply(report, e)}
                                                >
                                                    ✉️ {t('reports.btn_reply', 'Reply')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isReplyModalOpen && (
                <div className="reply-overlay" onClick={handleCloseReply}>
                    <div className="reply-modal" onClick={e => e.stopPropagation()}>
                        <h2 className="reply-modal__title">{t('reports.reply_modal_title', 'Reply to Reporter')}</h2>
                        <div className="form-group">
                            <label className="reply-modal__email">
                                {t('auth.label_email', 'Email')}: <strong>{replyingReport?.reporter_email}</strong>
                            </label>
                            <textarea
                                value={replyMessage}
                                onChange={(e) => setReplyMessage(e.target.value)}
                                placeholder={t('reports.reply_placeholder', 'Type your message here...')}
                                rows={5}
                            />
                        </div>

                        {replyResult && (
                            <div className={`alert ${replyResult.type === 'error' ? 'alert--error' : 'alert--success'}`}>
                                {replyResult.msg}
                            </div>
                        )}

                        <div className="reply-modal__actions">
                            <button className="btn btn--ghost" onClick={handleCloseReply} disabled={isReplying}>
                                {t('reports.btn_cancel', 'Cancel')}
                            </button>
                            <button className="btn btn--primary" onClick={handleSendReply} disabled={isReplying || !replyMessage.trim()}>
                                {isReplying ? t('reports.replying', 'Sending...') : t('reports.btn_send_reply', 'Send Reply')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
