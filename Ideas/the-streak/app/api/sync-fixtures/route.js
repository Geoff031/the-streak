import { supabase } from '@/lib/supabase'

function normalizeTeamName(name) {
  // Clean up API names
  let normalized = name
    .replace(' FC', '')
    .replace(' AFC', '')
    .trim()
  
  return normalized
}

export async function POST(req) {
  try {
    const { roundNumber } = await req.json()

    if (!roundNumber) {
      return Response.json({ error: 'Round number required' }, { status: 400 })
    }

    const { data: round, error: roundError } = await supabase
      .from('rounds')
      .select('*')
      .eq('round_number', roundNumber)
      .single()

    if (roundError || !round) {
      return Response.json({ error: 'Round not found' }, { status: 404 })
    }

    const { data: nextRound } = await supabase
      .from('rounds')
      .select('pick_deadline')
      .eq('round_number', roundNumber + 1)
      .single()

    const roundDeadline = new Date(round.pick_deadline)
    const nextDeadline = nextRound ? new Date(nextRound.pick_deadline) : new Date(roundDeadline.getTime() + 7 * 24 * 60 * 60 * 1000)

    console.log(`Syncing matches between ${roundDeadline} and ${nextDeadline}`)

    const response = await fetch(
      `https://api.football-data.org/v4/competitions/PL/matches?status=SCHEDULED`,
      {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
      }
    )

    const data = await response.json()

    if (!data.matches || data.matches.length === 0) {
      return Response.json({ error: 'No matches found' }, { status: 404 })
    }

    // Get teams and create a smarter mapping
    const { data: teams } = await supabase.from('teams').select('id, name')
    const teamMap = {}
    
    // Build a flexible team mapping
    teams.forEach((t) => {
      teamMap[t.name] = t.id
      // Also add normalized versions
      const normalized = t.name.replace(' & Hove ', ' & Hove ').toLowerCase()
      teamMap[normalized] = t.id
    })

    console.log('Available teams:', Object.keys(teamMap))

    const matchesToSync = data.matches.filter((match) => {
      const matchDate = new Date(match.utcDate)
      return matchDate > roundDeadline && matchDate < nextDeadline
    })

    console.log(`Found ${matchesToSync.length} matches in date range`)

    const matchesToInsert = matchesToSync.map((match) => {
      const homeApiName = match.homeTeam.name
      const awayApiName = match.awayTeam.name
      const homeNormalized = normalizeTeamName(homeApiName)
      const awayNormalized = normalizeTeamName(awayApiName)
      
      // Try exact match first, then normalized
      const homeTeamId = teamMap[homeNormalized] || 
                         Object.keys(teamMap).find(key => key.toLowerCase() === homeNormalized.toLowerCase())?.split(':')[0]
      const awayTeamId = teamMap[awayNormalized] || 
                         Object.keys(teamMap).find(key => key.toLowerCase() === awayNormalized.toLowerCase())?.split(':')[0]

      console.log(`${homeApiName} (${homeNormalized}) → ${homeTeamId ? 'FOUND' : 'NOT FOUND'}`)
      console.log(`${awayApiName} (${awayNormalized}) → ${awayTeamId ? 'FOUND' : 'NOT FOUND'}`)

      return {
        round_id: round.id,
        home_team_id: homeTeamId || teamMap[homeNormalized],
        away_team_id: awayTeamId || teamMap[awayNormalized],
        match_date: match.utcDate,
      }
    }).filter(m => m.home_team_id && m.away_team_id)

    if (matchesToInsert.length === 0) {
      return Response.json({ error: 'No matching teams found' }, { status: 404 })
    }

    const { error: insertError } = await supabase
      .from('matches')
      .insert(matchesToInsert)

    if (insertError) {
      return Response.json({ error: insertError.message }, { status: 500 })
    }

    return Response.json({
      success: true,
      matchesSync: matchesToInsert.length,
      message: `Synced ${matchesToInsert.length} matches for round ${roundNumber}`,
    })
  } catch (error) {
    console.error('Sync error:', error)
    return Response.json({ error: error.message }, { status: 500 })
  }
}