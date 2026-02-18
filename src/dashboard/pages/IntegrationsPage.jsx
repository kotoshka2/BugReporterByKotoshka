import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import IntegrationsList from './IntegrationsList';
import IntegrationSettings from './IntegrationSettings';

export default function IntegrationsPage({ client, onUpdate }) {
    return (
        <Routes>
            <Route index element={<IntegrationsList client={client} />} />
            <Route
                path=":integrationId"
                element={<IntegrationSettings client={client} onUpdate={onUpdate} />}
            />
            <Route path="*" element={<Navigate to="/dashboard/integrations" replace />} />
        </Routes>
    );
}
