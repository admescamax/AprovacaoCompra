/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Identidade VerticalParts — corporativo claro
                primary: '#1769ba',     // azul VP
                'primary-dark': '#11528f',
                secondary: '#374151',   // cinza escuro
                accent: '#1769ba',      // acento = primário VP
                background: '#f3f4f6',  // fundo claro da aplicação
                surface: '#ffffff',     // painéis brancos
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
