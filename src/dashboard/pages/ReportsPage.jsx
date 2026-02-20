import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';

export default function ReportsPage({ client }) {
    const { t } = useTranslation();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        if (client) fetchReports();
    }, [client]);

    const fetchReports = async () => {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('client_id', client.id)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Failed to fetch reports:', error);
        }
        setReports(data || []);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="page">
                <h1 className="page__title">{t('dashboard.title_reports')}</h1>
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="page">
            <h1 className="page__title">
                {t('dashboard.title_reports')}
                <span className="badge">{reports.length}</span>
            </h1>

            {reports.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state__icon">📭</span>
                    <h3>{t('reports.empty_title')}</h3>
                    <p>{t('reports.empty_desc')}</p>
                </div>
            ) : (
                <div className="reports-grid">
                    {reports.map((report) => (
                        <div
                            key={report.id}
                            className={`report-card ${selectedReport?.id === report.id ? 'report-card--selected' : ''}`}
                            onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                        >
                            <div className="report-card__header">
                                <span className="report-card__time">
                                    {new Date(report.created_at).toLocaleString('ru-RU')}
                                </span>
                                <div className="report-card__badges">
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
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
