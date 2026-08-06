'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [picksByGame, setPicksByGame] = useState({})
  const [streakStats, setStreakStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    roundsCompleted: 0
  })
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const email = localStorage.getItem('player_email')
    if (!email) {
      router.push('/login')
      return
    }

    fetchProfile(email)
  }, [router])

  const fetchProfile = async (email) => {
    const { data } = await supabase
      .from('players')
      .select('*')
      .eq('email', email)
      .single()

    setProfile(data)

    if (data) {
      await fetchPicks(data.id)
    }
    setLoading(false)
  }

  const fetchPicks = async (playerId) => {
    const { data: picksData } = await supabase
      .from('picks')
      .select(`
        id,
        round_id,
        team_id,
        is_eliminated,
        rounds:round_id(round_number, game_number),
        teams:team_id(name)
      `)
      .eq('player_id', playerId)
      .order('rounds(round_number)', { ascending: true })

    if (picksData) {
      // Group by game
      const grouped = {}
      picksData.forEach(pick => {
        const gameNum = pick.rounds.game_number
        if (!grouped[gameNum]) {
          grouped[gameNum] = []
        }
        grouped[gameNum].push(pick)
      })
      
      setPicksByGame(grouped)
      calculateStreaks(picksData)
    }
  }

  const calculateStreaks = (picksData) => {
    if (picksData.length === 0) {
      setStreakStats({
        currentStreak: 0,
        longestStreak: 0,
        roundsCompleted: 0
      })
      return
    }

    // Sort by round number
    const sorted = [...picksData].sort((a, b) => a.rounds.round_number - b.rounds.round_number)

    // Find longest streak (consecutive non-eliminated)
    let longestStreak = 0
    let currentStreak = 0

    sorted.forEach((pick) => {
      if (!pick.is_eliminated) {
        currentStreak++
        longestStreak = Math.max(longestStreak, currentStreak)
      } else {
        currentStreak = 0
      }
    })

    // Rounds completed = all rounds except the current active one
    const roundsCompleted = sorted.filter(p => p.is_eliminated).length

    setStreakStats({
      currentStreak,
      longestStreak: longestStreak || 1,
      roundsCompleted
    })
  }

  const handleLogout = () => {
    localStorage.removeItem('player_email')
    router.push('/login')
  }

  if (loading) return <div className="text-center py-8 text-white-900">Loading...</div>

  if (!profile) return <div className="text-center py-8 text-white-900">Profile not found</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white-900">Your Profile</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium transition"
        >
          Log Out
        </button>
      </div>

      {/* Account Info */}
      <div className="bg-white rounded-lg shadow p-6 border border-white-200 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Account Info</h2>
        <div className="space-y-2">
          <p className="text-gray-700">
            <span className="font-medium">Name:</span> {profile.name}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Email:</span> {profile.email}
          </p>
        </div>
      </div>

      {/* Your Streak */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 rounded-lg shadow p-6 border border-blue-200">
          <p className="text-sm text-gray-600 mb-2">Current Streak</p>
          <p className="text-4xl font-bold text-blue-600">{streakStats.currentStreak}</p>
          <p className="text-xs text-gray-600 mt-2">Rounds undefeated</p>
        </div>

        <div className="bg-purple-50 rounded-lg shadow p-6 border border-purple-200">
          <p className="text-sm text-gray-600 mb-2">Longest Streak</p>
          <p className="text-4xl font-bold text-purple-600">{streakStats.longestStreak}</p>
          <p className="text-xs text-gray-600 mt-2">Best run</p>
        </div>

        <div className="bg-green-50 rounded-lg shadow p-6 border border-green-200">
          <p className="text-sm text-gray-600 mb-2">Rounds Played</p>
          <p className="text-4xl font-bold text-green-600">{Object.values(picksByGame).flat().length}</p>
          <p className="text-xs text-gray-600 mt-2">Total rounds entered</p>
        </div>
      </div>

      {/* Current Round Picks - Grouped by Game */}
      <div className="bg-white rounded-lg shadow p-6 border border-white-200">
        <h2 className="text-xl font-semibold mb-4 text-gray-900">Your Picks</h2>
        
        {Object.keys(picksByGame).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(picksByGame).map(([gameNum, picks]) => (
              <div key={gameNum}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-white-300">
                  Game {gameNum}
                </h3>
                <div className="space-y-3">
                  {picks.map((pick) => (
                    <div key={pick.id} className={`flex justify-between items-center p-4 rounded border ${
                      pick.is_eliminated
                        ? 'bg-red-50 border-red-200'
                        : 'bg-green-50 border-green-200'
                    }`}>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Round {pick.rounds.round_number}</p>
                        <p className="text-gray-700 text-sm">{pick.teams.name}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded text-sm font-medium whitespace-nowrap ${
                          pick.is_eliminated
                            ? 'bg-red-200 text-red-900'
                            : 'bg-green-200 text-green-900'
                        }`}>
                          {pick.is_eliminated ? 'Eliminated' : 'Active'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-700">No picks yet. Make a pick in the Dashboard to get started!</p>
        )}
      </div>
    </div>
  )
}