import typography from '@tailwindcss/typography'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background colors
        'bg-main': '#FAF9F7',
        'bg-sidebar': '#F5F4F2',
        'bg-ai-panel': '#D4EDDA',
        'bg-card': '#FFFFFF',
        'bg-card-border': '#E5E4E2',

        // Text colors
        'text-primary': '#1A1A1A',
        'text-secondary': '#6B7280',
        'text-muted': '#9CA3AF',

        // Accent colors
        'accent-progress': '#10B981',
        'accent-alert': '#F59E0B',
        'accent-overdue': '#EF4444',
        'accent-new': '#3B82F6',

        // Button colors
        'btn-primary': '#1A1A1A',
        'btn-secondary': '#F3F4F6',
        'btn-action': '#FEF3C7',

        // Knowledge type badges
        'badge-factual': '#E0E7FF',
        'badge-factual-text': '#4338CA',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'sidebar': '250px',
        'sidebar-collapsed': '64px',
      },
      borderRadius: {
        'card': '12px',
        'button': '8px',
      },
    },
  },
  plugins: [
    typography,
  ],
}
