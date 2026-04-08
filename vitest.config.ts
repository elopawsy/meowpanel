import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['resources/scripts/**/*.{spec,test}.{ts,tsx}'],
        tsconfig: './tsconfig.test.json',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'resources/scripts'),
            '@definitions': path.resolve(__dirname, 'resources/scripts/api/definitions'),
            '@feature': path.resolve(__dirname, 'resources/scripts/components/server/features'),
        },
    },
});
