'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface Round {
  id: string
  round_number: number
  game_number: number
  pot_size: number
  pick_deadline: string
  results_entered: boolean
}

interface Team {
  id: string
  name: string
}

interface Game {
  id: string
  game_number: number
  started_round_number: number
  ended_round_number: number
  pot_size: number
  winner_id: string | null
}

export default function Admin() {
  const [email, setEmail] = useState<string>('')
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [rounds, setRounds] = useState<Round[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [currentRound, setCurrentRound] = useState<Round | null>(null)
  const [selectedRound, setSelectedRound] = useState<string>('')
  const [results, setResults] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<boolean>(true)
  const [message, setMessage] = useState<string>('')
  const [newRound, setNewRound] = useState({
    round_number: '',
    pick_deadline: '',
    game_number: '',
    pot_size: ''
  })
  const router = useRouter()

  const ADMIN_EMAIL = 'speirsg1010@gmail.com' // Change to your email

  useEffect(() => {
    const userEmail = localStorage.getItem('player_email')
    if (!userEmail) {
      router.push('/login')
      return
    }

    setEmail(userEmail)
    
    if (userEmail === ADMIN_EMAIL) {
      setIsAdmin(true)
      fetchRounds()
      fetchTeams()
      fetchGames()
      fetchCurrentRound()
    } else {
      setMessage('Access denied. Admin only.')
      setLoading(false)
    }
  }, [router])

  const fetchRounds = async () => {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .order('round_number', { ascending: true })
    setRounds(data as Round[] || [])
    setLoading(false)
  }

  const fetchTeams = async () => {
    const { data } = await supabase
      .from('teams')
      .select('*')
      .order('name', { ascending: true })
    setTeams(data as Team[] || [])
  }

  const fetchGames = async () => {
    const { data } = await supabase
      .from('games')
      .select('*')
      .order('game_number', { ascending: false })
    setGames(data as Game[] || [])
  }

  const fetchCurrentRound = async () => {
    const { data } = await supabase
      .from('rounds')
      .select('*')
      .eq('results_entered', false)
      .order('round_number', { ascending: true })
      .limit(1)
      .single()

    setCurrentRound(data as Round | null)
  }

  const handleResultChange = (teamId: string, outcome: string) => {
    setResults({
      ...results,
      [teamId]: outcome,
    })
  }

  const submitResults = async () => {
    if (!selectedRound) {
      setMessage('Please select a round')
      return
    }

    for (const [teamId, outcome] of Object.entries(results)) {
      if (outcome) {
        await supabase
          .from('results')
          .insert([{
            round_id: selectedRound,
            team_id: teamId,
            outcome,
          }])
      }
    }

    await supabase
      .from('rounds')
      .update({ results_entered: true })
      .eq('id', selectedRound)

    setMessage('Results submitted successfully!')
    setResults({})
    setSelectedRound('')
    fetchRounds()
    fetchCurrentRound()
  }

  const handleCreateRound = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newRound.round_number || !newRound.pick_deadline || !newRound.game_number) {
      setMessage('Please fill all required fields')
      return
    }

    const { error } = await supabase
      .from('rounds')
      .insert([{
        round_number: parseInt(newRound.round_number),
        pick_deadline: newRound.pick_deadline,
        game_number: parseInt(newRound.game_number),
        pot_size: newRound.pot_size ? parseInt(newRound.pot_size) : 0,
        results_entered: false
      }])

    if (error) {
      setMessage('Error creating round: ' + error.message)
    } else {
      setMessage('Round created successfully!')
      setNewRound({ round_number: '', pick_deadline: '', game_number: '', pot_size: '' })
      fetchRounds()
      fetchCurrentRound()
    }
  }

  const handleUpdatePotSize = async (roundId: string, potSize: string) => {
    if (!potSize || potSize === '0') {
      setMessage('Please enter a valid pot size')
      return
    }

    const { error } = await supabase
      .from('rounds')
      .update({ pot_size: parseInt(potSize) })
      .eq('id', roundId)

    if (error) {
      setMessage('Error updating pot: ' + error.message)
    } else {
      setMessage('Pot size updated!')
      fetchCurrentRound()
    }
  }

  if (loading) return <div className="text-center py-8 text-gray-900">Loading...</div>

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-white-900">Admin Panel</h1>
        <div className="bg-red-50 border border-red-200 text-red-900 px-6 py-8 rounded-lg">
          <p className="text-center font-medium">{message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-white-900">Admin Panel</h1>

      {message && (
        <div className={`px-4 py-3 rounded mb-6 ${
          message.includes('Error')
            ? 'bg-red-50 border border-red-200 text-red-900'
            : 'bg-green-50 border border-green-200 text-green-900'
        }`}>
          {message}
        </div>
      )}

      {/* Current Round Info */}
      {currentRound && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Current Active Round</h2>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Round</p>
              <p className="text-2xl font-bold text-gray-900">{currentRound.round_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Game</p>
              <p className="text-2xl font-bold text-gray-900">{currentRound.game_number}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Pot Size</p>
              <p className="text-2xl font-bold text-gray-900">R{currentRound.pot_size || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Deadline</p>
              <p className="text-lg text-gray-900">{new Date(currentRound.pick_deadline).toLocaleString()}</p>
            </div>
          </div>
          
          {currentRound.pot_size === 0 && (
            <div className="pt-6 border-t border-gray-300">
              <p className="text-sm text-gray-600 mb-3">Set Pot Size (when payments collected)</p>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g., 8000"
                  id="pot-input"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded text-gray-900"
                />
                <button
                  onClick={() => {
                    const potInput = document.getElementById('pot-input') as HTMLInputElement | null
                    if (potInput?.value) {
                      handleUpdatePotSize(currentRound.id, potInput.value)
                    }
                  }}
                  className="bg-gray-600 hover:bg-gray-900 text-white px-6 py-2 rounded font-medium"
                >
                  Set Pot
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs for different admin tasks */}
      <div className="space-y-8">
        {/* Enter Results */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Enter Match Results</h2>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Select Round
            </label>
            <select
              value={selectedRound}
              onChange={(e) => {
                setSelectedRound(e.target.value)
                setResults({})
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">Choose a round...</option>
              {rounds.filter(r => !r.results_entered).map((round) => (
                <option key={round.id} value={round.id}>
                  Round {round.round_number} (Game {round.game_number})
                </option>
              ))}
            </select>
          </div>

          {selectedRound && (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6">
                {teams.map((team) => (
                  <div key={team.id} className="border border-gray-300 rounded p-4">
                    <p className="font-medium mb-3 text-gray-900">{team.name}</p>
                    <div className="space-y-2">
                      {['win', 'draw', 'loss', 'postponed'].map((outcome) => (
                        <label key={outcome} className="flex items-center">
                          <input
                            type="radio"
                            name={team.id}
                            value={outcome}
                            checked={results[team.id] === outcome}
                            onChange={(e) => handleResultChange(team.id, e.target.value)}
                            className="mr-2"
                          />
                          <span className="capitalize text-sm text-gray-700">{outcome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={submitResults}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium"
              >
                Submit Results
              </button>
            </>
          )}
        </div>

        {/* Create New Round */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Create Next Round</h2>
          <form onSubmit={handleCreateRound} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Round Number</label>
                <input
                  type="number"
                  value={newRound.round_number}
                  onChange={(e) => setNewRound({ ...newRound, round_number: e.target.value })}
                  placeholder="e.g., 7"
                  className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Game Number</label>
                <input
                  type="number"
                  value={newRound.game_number}
                  onChange={(e) => setNewRound({ ...newRound, game_number: e.target.value })}
                  placeholder="e.g., 2"
                  className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Pick Deadline</label>
              <input
                type="datetime-local"
                value={newRound.pick_deadline}
                onChange={(e) => setNewRound({ ...newRound, pick_deadline: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900"
              />
              <p className="text-xs text-gray-600 mt-1">Usually Friday 00:00 GMT</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">Pot Size (Optional)</label>
              <input
                type="number"
                value={newRound.pot_size}
                onChange={(e) => setNewRound({ ...newRound, pot_size: e.target.value })}
                placeholder="Leave blank for now, set later"
                className="w-full px-4 py-2 border border-gray-300 rounded text-gray-900"
              />
              <p className="text-xs text-gray-600 mt-1">Can be set later once payments collected</p>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-medium"
            >
              Create Round
            </button>
          </form>
        </div>

        {/* Previous Games */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Completed Games</h2>
          
          {games.length > 0 ? (
            <div className="space-y-3">
              {games.map((game) => (
                <div key={game.id} className="border border-gray-300 rounded p-4 bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Game</p>
                      <p className="font-semibold text-gray-900">{game.game_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Rounds</p>
                      <p className="font-semibold text-gray-900">{game.started_round_number}-{game.ended_round_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Pot Size</p>
                      <p className="font-semibold text-gray-900">R{game.pot_size}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Winner</p>
                      <p className="font-semibold text-gray-900">{game.winner_id ? 'Yes' : 'Split'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-700">No completed games yet</p>
          )}
        </div>
      </div>
    </div>
  )
}