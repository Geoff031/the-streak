export async function GET(req) {
  try {
    const response = await fetch(
      `https://api.football-data.org/v4/competitions/PL/matches?status=SCHEDULED`,
      {
        headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY },
      }
    )

    const data = await response.json()
    
    // Return first 3 matches so you can see the team names
    return Response.json({
      totalMatches: data.matches.length,
      firstThreeMatches: data.matches.slice(0, 3).map(m => ({
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        date: m.utcDate,
      }))
    })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}