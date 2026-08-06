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

    // Fetch finished matches from football-data.org
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/PL/matches?status=FINISHED`,
      {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
      }
    )

    const data = await response.json()
    const finishedMatches = data.matches || []

    // Get all matches for this round
    const { data: roundMatches } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(name), away_team:away_team_id(name)')
      .eq('round_id', round.id)

    if (!roundMatches) {
      return Response.json({ error: 'No matches found' }, { status: 404 })
    }

    // Update match results
    for (const match of roundMatches) {
      const apiMatch = finishedMatches.find(
        (m) =>
          m.homeTeam.name === match.home_team.name &&
          m.awayTeam.name === match.away_team.name
      )

      if (apiMatch && apiMatch.status === 'FINISHED') {
        await supabase
          .from('matches')
          .update({
            home_result: apiMatch.score.fullTime.home,
            away_result: apiMatch.score.fullTime.away,
          })
          .eq('id', match.id)
      }
    }

    // Get all picks for this round that aren't eliminated
    const { data: picks } = await supabase
      .from('picks')
      .select('*, team:team_id(name)')
      .eq('round_id', round.id)
      .eq('is_eliminated', false)

    let eliminatedCount = 0
    
    if (picks && picks.length > 0) {
      // Check each pick
      for (const pick of picks) {
        const match = roundMatches.find(
          (m) =>
            m.home_team.name === pick.team.name ||
            m.away_team.name === pick.team.name
        )

        if (match) {
          const teamWon =
            (match.home_team.name === pick.team.name &&
              match.home_result > match.away_result) ||
            (match.away_team.name === pick.team.name &&
              match.away_result > match.home_result)

          if (!teamWon) {
            await supabase
              .from('picks')
              .update({ is_eliminated: true })
              .eq('id', pick.id)
            eliminatedCount++
          }
        }
      }
    }

    // Mark round as complete
    await supabase
      .from('rounds')
      .update({ results_entered: true })
      .eq('id', round.id)

    // CHECK IF GAME ENDED
    const { data: allRoundsInGame } = await supabase
      .from('rounds')
      .select('id, round_number')
      .eq('game_number', round.game_number)

    if (!allRoundsInGame || allRoundsInGame.length === 0) {
      return Response.json({ error: 'No rounds found for game' }, { status: 404 })
    }

    const gameRoundIds = allRoundsInGame.map(r => r.id)
    const startRound = allRoundsInGame.sort((a, b) => a.round_number - b.round_number)[0]

    // Count active players (not eliminated in any round of this game)
    const { data: activePlayers } = await supabase
      .from('picks')
      .select('player_id')
      .in('round_id', gameRoundIds)
      .eq('is_eliminated', false)

    const uniqueActivePlayers = activePlayers 
      ? [...new Set(activePlayers.map(p => p.player_id))]
      : []

    // If only 1 or fewer players remain, game is over
    if (uniqueActivePlayers.length <= 1) {
      await supabase
        .from('rounds')
        .update({ game_ended: true })
        .eq('id', round.id)

        // Calculate and set pot_size for all rounds in this game if not already set
      const potSize = round.pot_size || (eliminatedCount + uniqueActivePlayers.length) * 100
      const winnerId = uniqueActivePlayers.length === 1 ? uniqueActivePlayers[0] : null

      await supabase
        .from('games')
        .insert([{
          game_number: round.game_number,
          started_round_number: startRound.round_number,
          ended_round_number: roundNumber,
          winner_id: winnerId,
          pot_size: round.pot_size
        }])

      return Response.json({
        success: true,
        eliminatedCount,
        gameEnded: true,
        winner: winnerId ? 'Game over - winner found!' : 'All players eliminated - pot split',
      })
    }

    return Response.json({
      success: true,
      eliminatedCount,
      gameEnded: false,
      activePlayers: uniqueActivePlayers.length,
    })
  } catch (error) {
    console.error('Results check error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}