import Navigation from '@/components/Navigation'
import './globals.css'

export const metadata = {
  title: 'The Streak',
  description: 'PL prediction challenge',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gray text-gray-900">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}