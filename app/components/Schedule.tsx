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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('calendar')
  const [currentWeek, setCurrentWeek] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(5) // Show 5 game dates per page

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

  // Calendar view helper functions
  const getWeeksFromSchedule = () => {
    if (!scheduleData) return []
    
    const weeks: Array<{
      weekStart: Date
      weekEnd: Date
      days: Array<{
        date: Date
        games: Game[]
      }>
    }> = []
    
    // Group games by date
    const gamesByDate = new Map<string, Game[]>()
    scheduleData.leagueSchedule.gameDates.forEach(gameDate => {
      // Convert from "MM/DD/YYYY HH:MM:SS" to "YYYY-MM-DD"
      const datePart = gameDate.gameDate.split(' ')[0] // Get "MM/DD/YYYY"
      const [month, day, year] = datePart.split('/')
      const dateKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      gamesByDate.set(dateKey, gameDate.games)
    })
    
    // Find the date range
    const allDates = Array.from(gamesByDate.keys()).map(dateStr => new Date(dateStr)).sort((a, b) => a.getTime() - b.getTime())
    if (allDates.length === 0) return []
    
    // Start from the first Sunday before or on the first game date
    let currentDate = new Date(allDates[0])
    currentDate.setDate(currentDate.getDate() - currentDate.getDay()) // Go to Sunday
    
    // End after the last game date
    const lastDate = allDates[allDates.length - 1]
    
    while (currentDate <= lastDate) {
      const weekStart = new Date(currentDate)
      const weekEnd = new Date(currentDate)
      weekEnd.setDate(weekEnd.getDate() + 6)
      
      const days = []
      for (let i = 0; i < 7; i++) {
        const dayDate = new Date(currentDate)
        dayDate.setDate(dayDate.getDate() + i)
        
        const dateKey = dayDate.toLocaleDateString('en-CA') // YYYY-MM-DD format
        const games = gamesByDate.get(dateKey) || []
        
        days.push({
          date: dayDate,
          games
        })
      }
      
      weeks.push({
        weekStart,
        weekEnd,
        days
      })
      
      currentDate.setDate(currentDate.getDate() + 7) // Next week
    }
    
    return weeks
  }

  const weeks = getWeeksFromSchedule()
  const totalWeeks = weeks.length

  const goToWeek = (weekIndex: number) => {
    setCurrentWeek(weekIndex)
  }

  const goToPrevWeek = () => {
    if (currentWeek > 0) {
      setCurrentWeek(currentWeek - 1)
    }
  }

  const goToNextWeek = () => {
    if (currentWeek < totalWeeks - 1) {
      setCurrentWeek(currentWeek + 1)
    }
  }

  const formatWeekRange = (weekStart: Date, weekEnd: Date) => {
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' })
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' })
    const startDay = weekStart.getDate()
    const endDay = weekEnd.getDate()
    const year = weekEnd.getFullYear()
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
    }
  }

  // Pagination logic
  const getPaginatedData = () => {
    if (!scheduleData) return { paginatedDates: [], totalPages: 0 }
    
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedDates = scheduleData.leagueSchedule.gameDates.slice(startIndex, endIndex)
    const totalPages = Math.ceil(scheduleData.leagueSchedule.gameDates.length / itemsPerPage)
    
    return { paginatedDates, totalPages }
  }

  const { paginatedDates, totalPages } = getPaginatedData()

  const goToPage = (page: number) => {
    setCurrentPage(page)
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const goToPrevPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1)
    }
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
          <p className="text-gray-600 mb-4">
            Last updated: {new Date(scheduleData.meta.time).toLocaleString()}
          </p>
          
          {/* View Mode Toggle */}
          <div className="flex justify-center mb-6">
            <div className="bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Calendar View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                List View
              </button>
            </div>
          </div>
        </header>

{viewMode === 'calendar' ? (
          // Calendar View
          <div>
            {weeks.length > 0 && (
              <>
                {/* Week Navigation */}
                <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm">
                  <button
                    onClick={goToPrevWeek}
                    disabled={currentWeek === 0}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentWeek === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous Week</span>
                  </button>

                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {formatWeekRange(weeks[currentWeek].weekStart, weeks[currentWeek].weekEnd)}
                    </h2>
                    <p className="text-gray-500 text-sm">
                      Week {currentWeek + 1} of {totalWeeks}
                    </p>
                  </div>

                  <button
                    onClick={goToNextWeek}
                    disabled={currentWeek === totalWeeks - 1}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      currentWeek === totalWeeks - 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <span>Next Week</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 bg-gray-50 border-b">
                    {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                      <div key={day} className="p-4 text-center font-semibold text-gray-700 border-r last:border-r-0">
                        <div className="hidden sm:block">{day}</div>
                        <div className="sm:hidden">{day.slice(0, 3)}</div>
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7">
                    {weeks[currentWeek].days.map((day, dayIndex) => (
                      <div key={dayIndex} className="min-h-[200px] p-2 border-r border-b last:border-r-0">
                        {/* Date Header */}
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-gray-900">
                            {day.date.getDate()}
                          </span>
                          {day.games.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {day.games.length}
                            </span>
                          )}
                        </div>

                        {/* Games for this day */}
                        <div className="space-y-1">
                          {day.games.map((game) => (
                            <div key={game.gameId} className="bg-gray-50 rounded p-2 text-xs hover:bg-gray-100 transition-colors">
                              <div className="font-medium text-gray-900 mb-1">
                                {game.gameStatusText}
                              </div>
                              <div className="text-gray-700">
                                <div className="flex items-center justify-between mb-1">
                                  <span>{game.awayTeam.teamTricode}</span>
                                  <span className="text-gray-500">@</span>
                                  <span>{game.homeTeam.teamTricode}</span>
                                </div>
                                {game.gameSubLabel && (
                                  <div className="text-orange-600 font-medium">
                                    {game.gameSubLabel}
                                  </div>
                                )}
                                {getAllBroadcasters(game.broadcasters).length > 0 && (
                                  <div className="text-green-600 mt-1">
                                    {getAllBroadcasters(game.broadcasters)[0]}
                                    {getAllBroadcasters(game.broadcasters).length > 1 && ` +${getAllBroadcasters(game.broadcasters).length - 1}`}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          // List View (Original)
          <div className="space-y-8">
            {paginatedDates.map((gameDate, dateIndex) => (
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
        )}

        {/* Pagination Controls - Only for List View */}
        {viewMode === 'list' && totalPages > 1 && (
          <div className="flex flex-col items-center mt-8 space-y-4">
            {/* Page Info */}
            <div className="text-center">
              <p className="text-gray-600">
                Showing page {currentPage} of {totalPages} 
                <span className="text-gray-400 ml-2">
                  ({scheduleData.leagueSchedule.gameDates.length} total game dates)
                </span>
              </p>
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center space-x-2">
              {/* Previous Button */}
              <button
                onClick={goToPrevPage}
                disabled={currentPage === 1}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Previous</span>
                </span>
              </button>

              {/* Page Numbers */}
              <div className="flex space-x-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                  // Show first page, last page, current page, and pages around current
                  const shouldShow = 
                    pageNum === 1 || 
                    pageNum === totalPages || 
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  
                  if (!shouldShow) {
                    // Show ellipsis for gaps
                    if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                      return (
                        <span key={pageNum} className="px-3 py-2 text-gray-400">
                          ...
                        </span>
                      )
                    }
                    return null
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        pageNum === currentPage
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 hover:border-gray-400'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <span>Next</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </button>
            </div>

            {/* Quick Jump to First/Last */}
            {totalPages > 5 && (
              <div className="flex space-x-2 text-sm">
                <button
                  onClick={() => goToPage(1)}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Go to first page
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => goToPage(totalPages)}
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Go to last page
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
