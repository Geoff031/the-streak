import { supabase } from '@/lib/supabase'

export async function POST(req) {
  try {
    const { roundNumber } = await req.json()

    if (!roundNumber) {
      return Response.json({ error: 'Round number required' }, { status: 400 })
    }

    // Get the round
    const { data: round } = await supabase
      .from('rounds')
      .select('*')
      .eq('round_number', roundNumber)
      .single()

    if (!round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    // Check if deadline has passed
    const now = new Date()
    const deadline = new Date(round.pick_deadline)
    
    if (now < deadline) {
      return Response.json({ error: 'Deadline has not passed yet' }, { status: 400 })
    }

    // Get all players in this game
    const { data: gameRounds } = await supabase
      .from('rounds')
      .select('id')
      .eq('game_number', round.game_number)

    const gameRoundIds = gameRounds?.map(r => r.id) || []

    const { data: gamePlayers } = await supabase
      .from('picks')
      .select('player_id')
      .in('round_id', gameRoundIds)

    const uniquePlayers = [...new Set(gamePlayers?.map(p => p.player_id) || [])]

    // Get all teams in alphabetical order
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .order('name', { ascending: true })

    let autoPickedCount = 0

    // For each player, check if they have a pick for this round
    for (const playerId of uniquePlayers) {
      const { data: existingPick } = await supabase
        .from('picks')
        .select('id')
        .eq('player_id', playerId)
        .eq('round_id', round.id)
        .single()

      // If no pick, auto-assign
      if (!existingPick) {
        // Get teams already used by this player in this game
        const { data: usedPicks } = await supabase
          .from('picks')
          .select('team_id')
          .eq('player_id', playerId)
          .in('round_id', gameRoundIds)

        const usedTeamIds = new Set(usedPicks?.map(p => p.team_id) || [])

        // Find first team alphabetically that hasn't been used
        const availableTeam = teams.find(t => !usedTeamIds.has(t.id))

        if (availableTeam) {
          await supabase
            .from('picks')
            .insert([{
              player_id: playerId,
              round_id: round.id,
              team_id: availableTeam.id
            }])

          autoPickedCount++
        }
      }
    }

    return Response.json({
      success: true,
      autoPickedCount,
      message: `Auto-picked ${autoPickedCount} players`
    })
  } catch (error) {
    console.error('Auto-pick error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}