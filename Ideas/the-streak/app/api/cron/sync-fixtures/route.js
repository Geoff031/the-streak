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

    // Sync fixtures for current round
    const syncRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/sync-fixtures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundNumber: currentRound.round_number }),
    })

    const syncData = await syncRes.json()

    // Auto-pick for PREVIOUS round if deadline passed
    if (currentRound.round_number > 1) {
      const prevRoundNumber = currentRound.round_number - 1
      const autoPickRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/auto-pick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roundNumber: prevRoundNumber }),
      })

      const autoPickData = await autoPickRes.json()
      
      return Response.json({
        success: true,
        synced: syncData,
        autoPicked: autoPickData
      })
    }

    return Response.json({ success: true, synced: syncData })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}