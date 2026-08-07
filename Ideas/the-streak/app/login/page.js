import React from 'react'
import LoginClient from './LoginClient'

export default async function Page({ searchParams }) {
  const params = await searchParams  // ← ADD THIS LINE
  const mode = params?.mode ?? null
  return <LoginClient initialMode={mode} />
}