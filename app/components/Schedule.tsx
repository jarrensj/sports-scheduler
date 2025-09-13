'use client'

import { useEffect, useState } from 'react'

interface Team {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  teamSlug: string
  wins: number
  losses: number
  score: number
  seed: number
}

interface Broadcaster {
  broadcasterScope: string
  broadcasterMedia: string
  broadcasterId: number
  broadcasterDisplay: string
  broadcasterAbbreviation: string
  broadcasterDescription: string
  tapeDelayComments: string
  broadcasterVideoLink: string
  broadcasterTeamId: number
  broadcasterRanking: number | null
  localizationRegion: string
}

interface Broadcasters {
  nationalBroadcasters: Broadcaster[]
  nationalRadioBroadcasters: Broadcaster[]
  nationalOttBroadcasters: Broadcaster[]
  homeTvBroadcasters: Broadcaster[]
  homeRadioBroadcasters: Broadcaster[]
  homeOttBroadcasters: Broadcaster[]
  awayTvBroadcasters: Broadcaster[]
  awayRadioBroadcasters: Broadcaster[]
  awayOttBroadcasters: Broadcaster[]
}

interface Game {
  gameId: string
  gameCode: string
  gameStatus: number
  gameStatusText: string
  gameSequence: number
  gameDateEst: string
  gameTimeEst: string
  gameDateTimeEst: string
  gameDateUTC: string
  gameTimeUTC: string
  gameDateTimeUTC: string
  awayTeamTime: string
  homeTeamTime: string
  day: string
  monthNum: number
  weekNumber: number
  weekName: string
  ifNecessary: string
  seriesGameNumber: string
  gameLabel: string
  gameSubLabel: string
  seriesText: string
  arenaName: string
  arenaState: string
  arenaCity: string
  postponedStatus: string
  branchLink: string
  gameSubtype: string
  isNeutral: boolean
  broadcasters: Broadcasters
  homeTeam: Team
  awayTeam: Team
  pointsLeaders: any[]
}

interface GameDate {
  gameDate: string
  games: Game[]
}

interface LeagueSchedule {
  seasonYear: string
  leagueId: string
  gameDates: GameDate[]
}

interface ScheduleData {
  meta: {
    version: number
    request: string
    time: string
  }
  leagueSchedule: LeagueSchedule
}

export default function Schedule() {
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const response = await fetch('/api/schedule')
        if (!response.ok) {
          throw new Error('Failed to fetch schedule')
        }
        const data = await response.json()
        setScheduleData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchSchedule()
  }, [])

  const formatGameTime = (gameStatusText: string) => {
    return gameStatusText
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getAllBroadcasters = (broadcasters: Broadcasters) => {
    const allBroadcasters = [
      ...broadcasters.nationalBroadcasters,
      ...broadcasters.homeTvBroadcasters,
      ...broadcasters.homeRadioBroadcasters,
      ...broadcasters.awayTvBroadcasters,
      ...broadcasters.awayRadioBroadcasters
    ]
    
    return allBroadcasters
      .filter(broadcaster => broadcaster.broadcasterDisplay !== 'TBD' && broadcaster.broadcasterDisplay)
      .map(broadcaster => broadcaster.broadcasterDisplay)
  }

  if (loading) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="mt-4 text-gray-600">Loading NBA Schedule...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center">
        <div className="text-red-600 text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Schedule</h1>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!scheduleData) {
    return (
      <div className="min-h-screen p-8 flex flex-col items-center justify-center">
        <p>No schedule data available</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            NBA Schedule {scheduleData.leagueSchedule.seasonYear}
          </h1>
          <p className="text-gray-600">
            Last updated: {new Date(scheduleData.meta.time).toLocaleString()}
          </p>
        </header>

        <div className="space-y-8">
          {scheduleData.leagueSchedule.gameDates.slice(0, 10).map((gameDate, dateIndex) => (
            <div key={dateIndex} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="bg-blue-600 text-white px-6 py-4">
                <h2 className="text-xl font-semibold">
                  {formatDate(gameDate.gameDate)}
                </h2>
                <p className="text-blue-100">
                  {gameDate.games.length} game{gameDate.games.length !== 1 ? 's' : ''}
                </p>
              </div>
              
              <div className="p-6">
                <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
                  {gameDate.games.map((game, gameIndex) => (
                    <div key={game.gameId} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      {/* Game Header */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-sm font-medium">
                            {game.gameLabel}
                          </span>
                          {game.gameSubLabel && (
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-sm">
                              {game.gameSubLabel}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-semibold text-blue-600">
                            {formatGameTime(game.gameStatusText)}
                          </div>
                        </div>
                      </div>

                      {/* Teams */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500 w-12">Away:</span>
                            <span className="font-semibold text-gray-900">
                              {game.awayTeam.teamCity} {game.awayTeam.teamName}
                            </span>
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                              {game.awayTeam.teamTricode}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-500 w-12">Home:</span>
                            <span className="font-semibold text-gray-900">
                              {game.homeTeam.teamCity} {game.homeTeam.teamName}
                            </span>
                            <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-mono">
                              {game.homeTeam.teamTricode}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Venue */}
                      <div className="mb-3">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span>
                            {game.arenaName}
                            {game.arenaCity && `, ${game.arenaCity}`}
                            {game.arenaState && `, ${game.arenaState}`}
                          </span>
                          {game.isNeutral && (
                            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                              Neutral Site
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Broadcasters */}
                      <div className="border-t pt-3">
                        <div className="flex items-start space-x-2">
                          <svg className="w-4 h-4 mt-0.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <div className="flex-1">
                            <span className="text-sm text-gray-500 block mb-1">Broadcast:</span>
                            {getAllBroadcasters(game.broadcasters).length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {getAllBroadcasters(game.broadcasters).map((broadcaster, idx) => (
                                  <span key={idx} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                                    {broadcaster}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">TBD</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {scheduleData.leagueSchedule.gameDates.length > 10 && (
          <div className="text-center mt-8">
            <p className="text-gray-600">
              Showing first 10 game dates. Total: {scheduleData.leagueSchedule.gameDates.length} dates
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
