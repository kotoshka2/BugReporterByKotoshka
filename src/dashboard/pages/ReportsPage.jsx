import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function ReportsPage({ client }) {
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
                <h1 className="page__title">📋 Репорты</h1>
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="page">
            <h1 className="page__title">
                📋 Репорты
                <span className="badge">{reports.length}</span>
            </h1>

            {reports.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-state__icon">📭</span>
                    <h3>Пока нет репортов</h3>
                    <p>Установите виджет на сайт и отправьте первый баг-репорт.</p>
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
                                {report.comment || '(без комментария)'}
                            </p>

                            {selectedReport?.id === report.id && (
                                <div className="report-card__details">
                                    {report.screenshot_url && (
                                        <a href={report.screenshot_url} target="_blank" rel="noopener">
                                            <img src={report.screenshot_url} alt="Screenshot" className="report-card__screenshot" />
                                        </a>
                                    )}
                                    <div className="report-card__meta">
                                        <div><strong>URL:</strong> {report.page_url || '—'}</div>
                                        <div><strong>Browser:</strong> {report.browser || '—'}</div>
                                        <div><strong>OS:</strong> {report.os || '—'}</div>
                                        <div><strong>Screen:</strong> {report.screen_size || '—'}</div>
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
