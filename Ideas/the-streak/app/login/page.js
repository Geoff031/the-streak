import React from 'react'
import LoginClient from './LoginClient'

export default function Page({ searchParams }) {
  const mode = searchParams?.mode ?? null
  return <LoginClient initialMode={mode} />
}
