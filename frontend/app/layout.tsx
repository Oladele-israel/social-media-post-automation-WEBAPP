// app/layout.tsx
import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

export const metadata: Metadata = {
  title:       'LinkedUp',
  description: 'Schedule and automate your LinkedIn posts',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* AuthProvider never blocks render — children always mount */}
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}