/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // ── Marca VerticalParts ──────────────────────────────────
                primary: {
                    DEFAULT: '#F5C400',  // dourado — cor oficial da marca
                    dark: '#C99E00',     // hover / estados ativos
                    light: '#FFD400',    // destaque / glow
                },
                // ── Superfícies escuras (sidebar, painéis, shells) ────────
                surface: {
                    DEFAULT: '#0f0f0f',
                    card: '#1a1a1f',
                    elevated: '#222228',
                    border: 'rgba(255,255,255,0.08)',
                },
                // ── Status ───────────────────────────────────────────────
                success: '#22c55e',
                warning: '#f59e0b',
                danger: '#ef4444',
                info: '#3b82f6',
            },
            fontFamily: {
                sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
                display: ['"Barlow Condensed"', 'Inter', 'Impact', 'sans-serif'],
                mono: ['"JetBrains Mono"', 'SFMono-Regular', 'Consolas', 'monospace'],
            },
            boxShadow: {
                brand: '0 12px 28px rgba(245,196,0,0.25)',
                'brand-sm': '0 4px 14px rgba(245,196,0,0.18)',
                dark: '0 30px 80px rgba(0,0,0,0.5)',
                card: '0 2px 8px rgba(0,0,0,0.08)',
            },
            borderRadius: {
                DEFAULT: '0.25rem',   // 4px — botões, badges
            },
        },
    },
    plugins: [],
}
