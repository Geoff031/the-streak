'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [email, setEmail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = () => {
      const storedEmail = localStorage.getItem('player_email')
      setEmail(storedEmail)
      setIsLoggedIn(!!storedEmail)
      setLoading(false)
    }

    checkAuth()

    // Listen for storage changes
    window.addEventListener('storage', checkAuth)
    
    // Also check on focus (when coming back from login page)
    window.addEventListener('focus', checkAuth)

    return () => {
      window.removeEventListener('storage', checkAuth)
      window.removeEventListener('focus', checkAuth)
    }
  }, [])

  const isActive = (path) => pathname === path ? 'border-b-2 border-gray-900 text-gray-600' : 'text-gray-600 hover:text-gray-900'

  const handleLogout = () => {
    localStorage.removeItem('player_email')
    setIsLoggedIn(false)
    setEmail(null)
    router.push('/login')
  }

  if (loading) return null

  return (
    <nav className="bg-white border-b border-white-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">The Streak</h1>
        </div>
        <div className="flex gap-8 items-center justify-between">
          <div className="flex gap-8">
            {isLoggedIn && (
              <>
                <Link href="/dashboard" className={`pb-2 transition ${isActive('/dashboard')}`}>
                  Dashboard
                </Link>
                <Link href="/profile" className={`pb-2 transition ${isActive('/profile')}`}>
                  Profile
                </Link>
                {email === 'speirsg1010@gmail.com' && (
                  <Link href="/admin" className={`pb-2 transition ${isActive('/admin')}`}>
                    Admin
                  </Link>
                )}
              </>
            )}
            
            <Link href="/rules" className={`pb-2 transition ${isActive('/rules')}`}>
              Rules
            </Link>
          </div>
          <div className="flex gap-4">
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 font-medium transition"
              >
                Log Out
              </button>
            ) : (
              <>
                <Link href="/login?mode=login" className="bg-white border-gray-600 text-gray-600 hover:text-gray-900 px-4 py-2 rounded font-medium transition">
                  Log In
                </Link>
                <Link href="/login?mode=signup" className="bg-gray-600 hover:bg-gray-900 text-white px-4 py-2 rounded font-medium transition">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}