'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export default function Login() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'login') {
      setIsSignUp(false)
    } else if (mode === 'signup') {
      setIsSignUp(true)
    }
  }, [searchParams])

  const VALID_INVITE_CODE = 'THESTREAK2026'

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    // Validate inputs
    if (!password || password.length < 6) {
      setMessage('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setMessage('Passwords do not match')
      setLoading(false)
      return
    }

    if (!inviteCode || inviteCode !== VALID_INVITE_CODE) {
      setMessage('Invalid invite code')
      setLoading(false)
      return
    }

    const { data: existing } = await supabase
      .from('players')
      .select('id')
      .eq('email', email)
      .single()

    if (existing) {
      setMessage('This email is already registered')
      setLoading(false)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    const { error } = await supabase
      .from('players')
      .insert([{ email, name, password: hashedPassword }])

    if (error) {
      setMessage('Sign up failed: ' + error.message)
      setLoading(false)
      return
    }

    localStorage.setItem('player_email', email)
    // Dispatch storage event to update nav
    window.dispatchEvent(new Event('storage'))
    setMessage('Welcome! Redirecting...')
    setTimeout(() => router.push('/dashboard'), 1500)
    setLoading(false)
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { data: player, error } = await supabase
      .from('players')
      .select('id, email, name, password')
      .eq('email', email)
      .single()

    if (error || !player) {
      setMessage('Email not found')
      setLoading(false)
      return
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, player.password)
    if (!passwordMatch) {
      setMessage('Incorrect password')
      setLoading(false)
      return
    }

    localStorage.setItem('player_email', email)
    // Dispatch storage event to update nav
    window.dispatchEvent(new Event('storage'))
    setMessage('Login successful! Redirecting...')
    setTimeout(() => router.push('/dashboard'), 1500)
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-white-900">
        {isSignUp ? 'Join The Streak' : 'Log In'}
      </h1>

      <form onSubmit={isSignUp ? handleSignUp : handleLogin} className="bg-white rounded-lg shadow p-6 border border-white-200">
        {message && (
          <div className={`mb-4 px-4 py-3 rounded text-sm ${
            message.includes('Invalid') || message.includes('not found') || message.includes('failed') || message.includes('Incorrect')
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'bg-green-50 text-green-700 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        {isSignUp && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={isSignUp}
              className="w-full px-4 py-2 border border-white-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
            />
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-2 border border-white-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={isSignUp ? 'At least 6 characters' : ''}
            className="w-full px-4 py-2 border border-white-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
          />
        </div>

        {isSignUp && (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-white-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Invite Code
              </label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                className="w-full px-4 py-2 border border-white-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              />
            </div>
          </>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gray-600 hover:bg-gray-900 disabled:bg-white-400 text-white px-6 py-2 rounded font-medium transition mb-4"
        >
          {loading ? (isSignUp ? 'Signing up...' : 'Logging in...') : (isSignUp ? 'Sign Up' : 'Log In')}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsSignUp(!isSignUp)
            setMessage('')
            setPassword('')
            setConfirmPassword('')
          }}
          className="w-full text-gray-600 hover:text-gray-900 text-sm font-medium"
        >
          {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
        </button>
      </form>
    </div>
  )
}