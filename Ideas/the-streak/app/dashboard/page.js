'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [currentRound, setCurrentRound] = useState(null)
  const [matches, setMatches] = useState([])
  const [groupedMatches, setGroupedMatches] = useState({})
  const [selectedTeamId, setSelectedTeamId] = useState(null)
  const [playerPick, setPlayerPick] = useState(null)
  const [teamsUsed, setTeamsUsed] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [stats, setStats] = useState({
    totalPlayers: 0,
    totalPicks: 0,
    eliminatedPlayers: 0,
    teamPickPercentages: {}
  })
  const [submitting, setSubmitting] = useState(false)
  const router = useRouter()
  const topRef = useRef(null)

  useEffect(() => {
    const email = localStorage.getItem('player_email')
    if (!email) {
      router.push('/login')
      return
    }
    fetchCurrentRound()
  }, [router])

  const fetchCurrentRound = async () => {
    const { data, error } = await supabase
      .from('rounds')
      .select('*')
      .eq('results_entered', false)
      .order('round_number', { ascending: true })
      .limit(1)
      .single()

    if (error) {
      setMessage('No active round yet')
      setLoading(false)
    } else {
      setCurrentRound(data)
      fetchMatches(data.id)
      fetchPlayerPick(data.id)
      fetchTeamsUsed()
      fetchStats(data.id)
    }
  }

  const fetchMatches = async (roundId) => {
    const { data: matchesData, error } = await supabase
      .from('matches')
      .select('*, home_team:home_team_id(id, name), away_team:away_team_id(id, name)')
      .eq('round_id', roundId)
      .order('match_date', { ascending: true })

    if (!error && matchesData) {
      setMatches(matchesData)
      groupMatchesByDate(matchesData)
    }
    setLoading(false)
  }

  const fetchPlayerPick = async (roundId) => {
    const email = localStorage.getItem('player_email')
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('email', email)
      .single()

    if (player) {
      const { data: pick } = await supabase
        .from('picks')
        .select('team_id')
        .eq('player_id', player.id)
        .eq('round_id', roundId)
        .single()

      if (pick) {
        setPlayerPick(pick.team_id)
        setSelectedTeamId(pick.team_id)
      }
    }
  }

  const fetchTeamsUsed = async () => {
  const email = localStorage.getItem('player_email')
  const { data: player } = await supabase
    .from('players')
    .select('id')
    .eq('email', email)
    .single()

  if (player && currentRound) {
    // Get all rounds in this game
    const { data: gameRounds } = await supabase
      .from('rounds')
      .select('id')
      .eq('game_number', currentRound.game_number)

    const gameRoundIds = gameRounds?.map(r => r.id) || []

    // Only get picks from this game
    const { data: picks } = await supabase
      .from('picks')
      .select('team_id')
      .eq('player_id', player.id)
      .in('round_id', gameRoundIds)

    const usedTeams = new Set(picks?.map(p => p.team_id) || [])
    setTeamsUsed(usedTeams)
  }
}

  const fetchStats = async (roundId) => {
  const { data: round } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .single()

  // Only get picks for THIS round
  const { data: picks } = await supabase
    .from('picks')
    .select('team_id, is_eliminated')
    .eq('round_id', roundId)

  const { data: matchesData } = await supabase
    .from('matches')
    .select('home_team_id, away_team_id')
    .eq('round_id', roundId)

  const teamIds = new Set()
  matchesData?.forEach(m => {
    teamIds.add(m.home_team_id)
    teamIds.add(m.away_team_id)
  })

  const teamPickCount = {}
  picks?.forEach(pick => {
    teamPickCount[pick.team_id] = (teamPickCount[pick.team_id] || 0) + 1
  })

  const teamPickPercentages = {}
  teamIds.forEach(teamId => {
    const pickCount = teamPickCount[teamId] || 0
    const percentage = picks?.length > 0 ? Math.round((pickCount / picks.length) * 100) : 0
    teamPickPercentages[teamId] = percentage
  })

  // Get all players for this game
  const { data: gameRounds } = await supabase
    .from('rounds')
    .select('id')
    .eq('game_number', round.game_number)

  const gameRoundIds = gameRounds?.map(r => r.id) || []

  const { data: gamePicks } = await supabase
    .from('picks')
    .select('player_id')
    .in('round_id', gameRoundIds)
    .eq('is_eliminated', false)

  const activePlayers = gamePicks ? [...new Set(gamePicks.map(p => p.player_id))] : []
  const { data: allGamePlayers } = await supabase
    .from('picks')
    .select('player_id')
    .in('round_id', gameRoundIds)

  const totalGamePlayers = [...new Set(allGamePlayers?.map(p => p.player_id) || [])]

  const eliminatedCount = (totalGamePlayers.length - activePlayers.length)

  setStats({
    totalPlayers: totalGamePlayers.length,
    totalPicks: picks?.length || 0,
    eliminatedPlayers: eliminatedCount,
    teamPickPercentages,
  })
}

  const groupMatchesByDate = (matchesData) => {
    const grouped = {}
    
    matchesData.forEach((match) => {
      const matchDate = new Date(match.match_date)
      const dateKey = matchDate.toISOString().split('T')[0]
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(match)
    })

    setGroupedMatches(grouped)
  }

  const formatDateHeader = (dateString) => {
    const date = new Date(dateString + 'T12:00:00Z')
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const dayName = dayNames[date.getDay()]
    const dateFormatted = date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
    return `${dayName} - ${dateFormatted}`
  }

  const handlePickSubmit = async () => {
    if (!selectedTeamId || !currentRound) {
      setMessage('Please select a team')
      return
    }

    if (teamsUsed.has(selectedTeamId)) {
      setMessage('You have already used this team in a previous round')
      return
    }

    setSubmitting(true)
    const email = localStorage.getItem('player_email')
    
    const { data: player } = await supabase
      .from('players')
      .select('id')
      .eq('email', email)
      .single()

    if (!player) {
      setMessage('Player not found')
      setSubmitting(false)
      return
    }

    const { data: existingPick } = await supabase
      .from('picks')
      .select('id')
      .eq('player_id', player.id)
      .eq('round_id', currentRound.id)
      .single()

    if (existingPick) {
      const { error } = await supabase
        .from('picks')
        .update({ team_id: selectedTeamId })
        .eq('id', existingPick.id)

      if (error) {
        setMessage('Error updating pick: ' + error.message)
      } else {
        setPlayerPick(selectedTeamId)
        setTeamsUsed(new Set([...teamsUsed, selectedTeamId]))
        setMessage('Pick updated successfully!')
        fetchStats(currentRound.id)
      }
    } else {
      const { error } = await supabase
        .from('picks')
        .insert([{
          player_id: player.id,
          round_id: currentRound.id,
          team_id: selectedTeamId
        }])

      if (error) {
        setMessage('Error submitting pick: ' + error.message)
      } else {
        setPlayerPick(selectedTeamId)
        setTeamsUsed(new Set([...teamsUsed, selectedTeamId]))
        setMessage('Pick submitted successfully!')
        fetchStats(currentRound.id)
      }
    }

    setSubmitting(false)
    topRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  if (loading) return <div className="text-center py-8 text-gray-900">Loading...</div>

  const selectedTeamName = selectedTeamId 
    ? matches.flatMap(m => [m.home_team, m.away_team]).find(t => t.id === selectedTeamId)?.name 
    : null

  return (
    <div ref={topRef} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h1 className="text-3xl font-bold mb-6 text-white-900">Dashboard</h1>

        {message && (
          <div className={`px-4 py-3 rounded mb-6 ${
            message.includes('Error') || message.includes('already')
              ? 'bg-red-50 border border-red-200 text-red-900' 
              : 'bg-green-50 border border-green-200 text-green-900'
          }`}>
            {message}
          </div>
        )}

        {currentRound ? (
          <div className="bg-white rounded-lg shadow p-6 mb-8 border border-white-200">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2 text-gray-900">Round {currentRound.round_number}</h2>
              <p className="text-gray-700 mb-4">
                Deadline: {new Date(currentRound.pick_deadline).toLocaleString()}
              </p>
              
              {teamsUsed.size > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 px-3 py-2 rounded mb-4 text-sm text-yellow-900">
                  <span className="font-medium">Teams used:</span> {
                    matches
                      .flatMap(m => [m.home_team, m.away_team])
                      .filter((team, idx, arr) => arr.findIndex(t => t.id === team.id) === idx && teamsUsed.has(team.id))
                      .map(t => t.name)
                      .join(', ')
                  }
                </div>
              )}

              {selectedTeamName && (
                <div className={`px-3 py-2 rounded inline-block ${
                  playerPick === selectedTeamId 
                    ? 'bg-green-50 border border-green-200 text-green-900' 
                    : 'bg-blue-50 border border-blue-200 text-blue-900'
                }`}>
                  {playerPick === selectedTeamId ? '✓ Submitted' : 'Selected'}: <span className="font-semibold">{selectedTeamName}</span>
                </div>
              )}
            </div>

            {Object.keys(groupedMatches).length > 0 ? (
              <>
                <div className="space-y-6 mb-8">
                  {Object.keys(groupedMatches).sort().map((dateKey) => (
                    <div key={dateKey}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-white-300">
                        {formatDateHeader(dateKey)}
                      </h3>
                      
                      <div className="space-y-3">
                        {groupedMatches[dateKey].map((match) => {
                          const homeUsed = teamsUsed.has(match.home_team.id)
                          const awayUsed = teamsUsed.has(match.away_team.id)
                          
                          return (
                            <div key={match.id} className={`border rounded-lg p-4 transition ${
                              selectedTeamId === match.home_team.id || selectedTeamId === match.away_team.id
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-gray-50 border-white-300 hover:bg-white-100'
                            }`}>
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  onClick={() => setSelectedTeamId(match.home_team.id)}
                                  disabled={homeUsed && selectedTeamId !== match.home_team.id}
                                  className={`flex-1 text-left p-3 rounded font-medium transition ${
                                    selectedTeamId === match.home_team.id
                                      ? 'bg-blue-600 text-white'
                                      : homeUsed
                                      ? 'bg-white-300 text-white-600 cursor-not-allowed opacity-60'
                                      : 'bg-white text-gray-900 hover:bg-blue-50 border border-white-300'
                                  }`}
                                  title={homeUsed ? 'Already used this team' : ''}
                                >
                                  {match.home_team.name}
                                  {homeUsed && ' ✓'}
                                </button>
                                
                                <div className="px-3 text-gray-600 font-medium text-sm whitespace-nowrap">
                                  {new Date(match.match_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                                
                                <button
                                  onClick={() => setSelectedTeamId(match.away_team.id)}
                                  disabled={awayUsed && selectedTeamId !== match.away_team.id}
                                  className={`flex-1 text-right p-3 rounded font-medium transition ${
                                    selectedTeamId === match.away_team.id
                                      ? 'bg-blue-600 text-gray'
                                      : awayUsed
                                      ? 'bg-white-300 text-gray-600 cursor-not-allowed opacity-60'
                                      : 'bg-white text-gray-900 hover:bg-blue-50 border border-white-300'
                                  }`}
                                  title={awayUsed ? 'Already used this team' : ''}
                                >
                                  {match.away_team.name}
                                  {awayUsed && ' ✓'}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handlePickSubmit}
                  disabled={!selectedTeamId || submitting || teamsUsed.has(selectedTeamId)}
                  className="bg-gray-600 hover:bg-gray-900 disabled:bg-white-400 text-white px-6 py-2 rounded font-medium transition"
                >
                  {submitting ? 'Submitting...' : playerPick ? 'Update Pick' : 'Submit Pick'}
                </button>
              </>
            ) : (
              <p className="text-gray-700">No matches available for this round yet.</p>
            )}
          </div>
        ) : (
          <div className="bg-white-100 rounded-lg p-8 text-center text-gray-700 border border-white-300">
            {message || 'Waiting for the next round...'}
          </div>
        )}
      </div>

      {/* Stats sidebar */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow p-6 border border-white-200 sticky top-20">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Round Stats</h3>
          
          <div className="space-y-4">
            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
              <p className="text-sm text-gray-600">Pot Size</p>
              <p className="text-3xl font-bold text-amber-600">
                R{currentRound?.pot_size}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Game {currentRound?.game_number} Pot
              </p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-gray-600">Players in Round</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalPlayers}</p>
            </div>

            {currentRound && currentRound.round_number > 1 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm text-gray-600">Players Eliminated</p>
                <p className="text-3xl font-bold text-red-600">{stats.eliminatedPlayers}</p>
                <p className="text-xs text-gray-600 mt-1">From this round</p>
              </div>
            )}

            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600">Picks Made</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalPicks}</p>
              {stats.totalPlayers > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  {Math.round((stats.totalPicks / stats.totalPlayers) * 100)}% submitted
                </p>
              )}
            </div>

            {matches.length > 0 && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <p className="text-sm text-gray-600 mb-3">Team Pick Percentages</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {matches
                    .flatMap(m => [
                      { ...m.home_team, percentage: stats.teamPickPercentages[m.home_team.id] || 0 },
                      { ...m.away_team, percentage: stats.teamPickPercentages[m.away_team.id] || 0 }
                    ])
                    .filter((team, idx, arr) => arr.findIndex(t => t.id === team.id) === idx)
                    .sort((a, b) => b.percentage - a.percentage)
                    .map((team) => (
                      <div key={team.id} className={`flex justify-between items-center text-xs p-2 rounded ${
                        team.id === selectedTeamId ? 'bg-white border border-purple-300' : ''
                      }`}>
                        <span className="text-gray-700 truncate">{team.name}</span>
                        <span className="font-semibold text-purple-600 ml-2">{team.percentage}%</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}