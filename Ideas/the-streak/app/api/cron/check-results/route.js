export async function GET(req) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get current active round
    const roundRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/get-current-round`)
    const currentRound = await roundRes.json()

    if (!currentRound || currentRound.error) {
      return Response.json({ error: 'No active round found' }, { status: 404 })
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/check-results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: currentRound.round_number }),
    })

    const data = await response.json()
    return Response.json({ success: true, data })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}