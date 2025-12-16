import './globals.css'
import { SocketProvider } from '@/context/SocketContext'
import { ConfirmationProvider } from '@/context/ConfirmationContext'
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
    <html lang="en">
      <body>
        <SocketProvider>
          <ConfirmationProvider>
            {children}
            <Toaster richColors position="top-right" />
          </ConfirmationProvider>
        </SocketProvider>
      </body>
    </html>
  )
}
