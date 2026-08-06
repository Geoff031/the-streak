import Navigation from '@/components/Navigation'
import './globals.css'

export const metadata = {
  title: 'The Streak',
  description: 'Premier League prediction competition',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}