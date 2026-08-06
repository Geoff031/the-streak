// Simple invite code validation
// In a real app, you'd use proper auth (Supabase Auth, NextAuth, etc.)

const VALID_INVITE_CODE = 'THESTREAK2026' // Change this to your actual invite code

export function validateInviteCode(code) {
  return code === VALID_INVITE_CODE
}

export function getInviteCode() {
  return VALID_INVITE_CODE
}