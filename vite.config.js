import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dashboard SPA config (default: npm run dev / npm run build)
export default defineConfig({
    plugins: [react()],
    base: '/',
    build: {
        outDir: 'dist/dashboard',
        rollupOptions: {
            input: 'dashboard.html',
        },
    },
    server: {
        port: 3000,
        open: '/dashboard.html',
    },
});
