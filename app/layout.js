import './globals.css'
import { SocketProvider } from '@/context/SocketContext'
import { ConfirmationProvider } from '@/context/ConfirmationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { AppSettingsProvider } from '@/contexts/AppSettingsContext'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'PM - Gestion de Projets',
  description: 'Plateforme complète de gestion de projets Agile avec Kanban, Sprints et Budget',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '48x48' },
      { url: '/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-32.png" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16.png" type="image/png" sizes="16x16" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <PreferencesProvider>
            <AppSettingsProvider>
              <SocketProvider>
                <ConfirmationProvider>
                  {children}
                  <Toaster richColors position="top-right" />
                </ConfirmationProvider>
              </SocketProvider>
            </AppSettingsProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
