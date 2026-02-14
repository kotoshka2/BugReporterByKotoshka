import { defineConfig } from 'vite';
import { resolve } from 'path';

// Widget Library config (npm run build:widget)
export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/widget/index.js'),
            name: 'BugReportWidget',
            fileName: 'widget',
            formats: ['iife'],
        },
        rollupOptions: {
            output: {
                assetFileNames: 'widget.[ext]',
            },
        },
        outDir: 'dist/widget',
        minify: 'esbuild',
    },
});
