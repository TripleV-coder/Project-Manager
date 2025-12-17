import './globals.css'
import { SocketProvider } from '@/context/SocketContext'
import { ConfirmationProvider } from '@/context/ConfirmationContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { PreferencesProvider } from '@/contexts/PreferencesContext'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'PM - Gestion de Projets',
  description: 'Plateforme complète de gestion de projets Agile avec Kanban, Sprints et Budget',
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <PreferencesProvider>
            <SocketProvider>
              <ConfirmationProvider>
                {children}
                <Toaster richColors position="top-right" />
              </ConfirmationProvider>
            </SocketProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
