export default {
    content: ['./index.html', './src/**/*.{js,jsx}'],
    theme: {
        extend: {
            fontFamily: {
                display: ['"Outfit"', 'sans-serif'],
                body: ['"Outfit"', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'monospace'],
            },
            colors: {
                orchid: {
                    50: '#f7eff3',
                    100: '#eadde6',
                    200: '#d6bbce',
                    300: '#c199b5',
                    400: '#ad779d',
                    500: '#995584',
                    600: '#7a3e65',
                    700: '#5f0f40', // Deep Purple (Base)
                    800: '#4a0c32',
                    900: '#360925',
                    950: '#210516',
                },
                jade: {
                    50: '#f0f9fa',
                    100: '#e0f2f1',
                    200: '#b2dfdb',
                    300: '#80cbc4',
                    400: '#4db6ac',
                    500: '#26a69a',
                    600: '#0f4c5c', // Deep Teal (Base)
                    700: '#0d404d',
                    800: '#0a343e',
                    900: '#072830',
                },
                crimson: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#9a031e', // Crimson (Base)
                    700: '#7f0219',
                    800: '#660214',
                    900: '#4c010f',
                },
                amber: {
                    50: '#fff7ed',
                    100: '#ffedd5',
                    200: '#fed7aa',
                    300: '#fdba74',
                    400: '#fb923c',
                    500: '#fb8b24', // Orange (Base)
                    600: '#e36414', // Terracotta (Accent)
                    700: '#c2410c',
                    800: '#9a3412',
                    900: '#7c2d12',
                },
                cream: '#fafaf9',
                bark: '#1c1917',
            }
        }
    },
    plugins: []
}