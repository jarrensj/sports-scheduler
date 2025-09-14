'use client'

import { useEffect, useState, useCallback } from 'react'
import { GameCalendarCard } from './GameCalendarCard'
import UserPreferences from './UserPreferences'

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
  pointsLeaders: unknown[]
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
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [isEmailSending, setIsEmailSending] = useState(false)
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateStatus, setGenerateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [generatedCalendar, setGeneratedCalendar] = useState<{
    optimizedGames: Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string }>
    tvSchedule: Record<number, Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string }>>
    recommendations: string[]
    weekSummary: string
  } | null>(null)
  const [userPreferences, setUserPreferences] = useState<{
    sportsInterests: string[]
    numberOfTvs: number
    tvSetupDescription: string
    favoriteNbaTeams: string[]
    zipCode: string
  } | null>(null)

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
    const currentDate = new Date(allDates[0])
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

  // Helper function to calculate game end time (3.5 hours after start)
  const getEndTime = (startTime: string) => {
    try {
      // Parse time like "7:00 pm ET"
      const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
      if (!timeMatch) return 'End Time TBD'
      
      let hours = parseInt(timeMatch[1])
      const minutes = parseInt(timeMatch[2])
      const period = timeMatch[3].toLowerCase()
      
      if (period === 'pm' && hours !== 12) hours += 12
      if (period === 'am' && hours === 12) hours = 0
      
      // Add 3.5 hours
      const totalMinutes = hours * 60 + minutes + (3.5 * 60)
      const endHours = Math.floor(totalMinutes / 60) % 24
      const endMins = Math.floor(totalMinutes % 60)
      
      const endPeriod = endHours >= 12 ? 'pm' : 'am'
      const displayHours = endHours === 0 ? 12 : endHours > 12 ? endHours - 12 : endHours
      
      return `${displayHours}:${endMins.toString().padStart(2, '0')} ${endPeriod} ET`
    } catch {
      return 'End Time TBD'
    }
  }

  // Time-based positioning helpers
  const parseGameTime = (gameStatusText: string) => {
    // Parse time from formats like "12:00 pm ET", "10:30 pm ET", etc.
    const timeMatch = gameStatusText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
    if (!timeMatch) return null
    
    let hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    const period = timeMatch[3].toLowerCase()
    
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    
    return hours * 60 + minutes // Return minutes from midnight
  }

  const getGamePosition = (game: Game, dayGames: Game[]) => {
    const gameTime = parseGameTime(game.gameStatusText)
    if (gameTime === null) return { top: 0, left: 0, width: 100 }
    
    // Define time range (6 AM to 2 AM next day = 20 hours)
    const startTime = 6 * 60 // 6 AM in minutes
    const endTime = 26 * 60 // 2 AM next day (26:00) in minutes
    const totalRange = endTime - startTime
    
    // Adjust for times after midnight
    const adjustedTime = gameTime < startTime ? gameTime + 24 * 60 : gameTime
    
    // Calculate vertical position (0-95% to leave room for card height)
    const topPercent = Math.max(0, Math.min(95, ((adjustedTime - startTime) / totalRange) * 95))
    
    // Find all games with valid times for this day
    const validGames = dayGames.filter(g => parseGameTime(g.gameStatusText) !== null)
    
    // Group games by time slots (within 2 hours of each other)
    const timeSlots: Game[][] = []
    validGames.forEach(g => {
      const gTime = parseGameTime(g.gameStatusText)!
      const adjustedGTime = gTime < startTime ? gTime + 24 * 60 : gTime
      
      let addedToSlot = false
      for (const slot of timeSlots) {
        const slotTime = parseGameTime(slot[0].gameStatusText)!
        const adjustedSlotTime = slotTime < startTime ? slotTime + 24 * 60 : slotTime
        
        // If within 2 hours, add to this slot
        if (Math.abs(adjustedGTime - adjustedSlotTime) <= 120) {
          slot.push(g)
          addedToSlot = true
          break
        }
      }
      
      if (!addedToSlot) {
        timeSlots.push([g])
      }
    })
    
    // Find which slot this game belongs to
    const currentSlot = timeSlots.find(slot => slot.some(g => g.gameId === game.gameId))
    if (!currentSlot) return { top: topPercent, left: 0, width: 100 }
    
    // Sort games in slot by time
    currentSlot.sort((a, b) => {
      const timeA = parseGameTime(a.gameStatusText)!
      const timeB = parseGameTime(b.gameStatusText)!
      const adjA = timeA < startTime ? timeA + 24 * 60 : timeA
      const adjB = timeB < startTime ? timeB + 24 * 60 : timeB
      return adjA - adjB
    })
    
    // Calculate position within the slot
    const slotSize = currentSlot.length
    const gameIndexInSlot = currentSlot.findIndex(g => g.gameId === game.gameId)
    
    if (slotSize === 1) {
      return { top: topPercent, left: 0, width: 100 }
    }
    
    // For multiple games, distribute them evenly with some padding
    const padding = 2 // 2% padding between cards
    const availableWidth = 100 - (padding * (slotSize - 1))
    const cardWidth = availableWidth / slotSize
    const left = gameIndexInSlot * (cardWidth + padding)
    
    return { 
      top: topPercent, 
      left: Math.max(0, Math.min(left, 100 - cardWidth)), 
      width: Math.max(25, Math.min(cardWidth, 100)) // Minimum 25% width, maximum 100%
    }
  }

  // Generate time grid lines
  const getTimeGridLines = () => {
    const lines = []
    // From 6 AM to 2 AM next day
    for (let hour = 6; hour <= 26; hour += 2) {
      const displayHour = hour > 24 ? hour - 24 : hour
      const period = hour >= 12 && hour < 24 ? 'PM' : 'AM'
      const displayHour12 = displayHour === 0 ? 12 : displayHour > 12 ? displayHour - 12 : displayHour
      
      const position = ((hour - 6) / 20) * 100
      lines.push({
        position,
        label: `${displayHour12}${period}`
      })
    }
    return lines
  }

  const timeGridLines = getTimeGridLines()

  // Modal handlers
  const openGameModal = (game: Game) => {
    setSelectedGame(game)
    setIsModalOpen(true)
  }

  const closeGameModal = () => {
    setSelectedGame(null)
    setIsModalOpen(false)
  }

  // Email handlers
  const openEmailModal = () => {
    setIsEmailModalOpen(true)
    setEmailStatus(null)
  }

  const closeEmailModal = () => {
    setIsEmailModalOpen(false)
    setEmailAddress('')
    setEmailStatus(null)
  }

  const sendWeeklyEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Please enter a valid email address' })
      return
    }

    if (!weeks[currentWeek]) {
      setEmailStatus({ type: 'error', message: 'No week data available' })
      return
    }

    setIsEmailSending(true)
    setEmailStatus(null)

    try {
      // Collect all games for the current week
      const weekGames: Game[] = []
      weeks[currentWeek].days.forEach(day => {
        weekGames.push(...day.games)
      })

      const weekData = {
        weekStart: weeks[currentWeek].weekStart.toISOString(),
        weekEnd: weeks[currentWeek].weekEnd.toISOString(),
        games: weekGames
      }

      const response = await fetch('/api/email-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekData,
          recipientEmail: emailAddress
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      setEmailStatus({ 
        type: 'success', 
        message: `Schedule for ${result.weekRange} sent successfully to ${emailAddress}!` 
      })
      
      // Close modal after 2 seconds
      setTimeout(() => {
        closeEmailModal()
      }, 2000)

    } catch (error) {
      setEmailStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to send email' 
      })
    } finally {
      setIsEmailSending(false)
    }
  }

  // Handle user preferences changes
  const handlePreferencesChange = useCallback((preferences: {
    sportsInterests: string[]
    numberOfTvs: number
    tvSetupDescription: string
    favoriteNbaTeams: string[]
    zipCode: string
  }) => {
    setUserPreferences(preferences)
  }, [])

  // Generate calendar handlers
  const openGenerateModal = () => {
    setIsGenerateModalOpen(true)
    setGenerateStatus(null)
  }

  const closeGenerateModal = () => {
    setIsGenerateModalOpen(false)
    setGenerateStatus(null)
  }

  const generateOptimizedCalendar = async () => {
    if (!weeks[currentWeek]) {
      setGenerateStatus({ type: 'error', message: 'No week data available' })
      return
    }

    if (!userPreferences) {
      setGenerateStatus({ type: 'error', message: 'Please set your preferences first' })
      return
    }

    setIsGenerating(true)
    setGenerateStatus(null)

    try {
      // Collect all games for the current week
      const weekGames: Game[] = []
      weeks[currentWeek].days.forEach(day => {
        weekGames.push(...day.games)
      })

      const weekData = {
        weekStart: weeks[currentWeek].weekStart.toISOString(),
        weekEnd: weeks[currentWeek].weekEnd.toISOString(),
        games: weekGames
      }

      const response = await fetch('/api/generate-calendar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekData,
          userPreferences
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate calendar')
      }

      setGeneratedCalendar(result)
      setGenerateStatus({ 
        type: 'success', 
        message: 'Optimized calendar generated successfully!' 
      })

    } catch (error) {
      setGenerateStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to generate calendar' 
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isModalOpen) {
          closeGameModal()
        }
        if (isEmailModalOpen) {
          closeEmailModal()
        }
        if (isGenerateModalOpen) {
          closeGenerateModal()
        }
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isModalOpen, isEmailModalOpen, isGenerateModalOpen])

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
        </header>

        {/* User Preferences Section */}
        <UserPreferences onPreferencesChange={handlePreferencesChange} />
          
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
                    <div className="mt-2 flex items-center justify-center space-x-2">
                      <button
                        onClick={openGenerateModal}
                        className="flex items-center space-x-2 px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span>Generate</span>
                      </button>
                      <button
                        onClick={openEmailModal}
                        className="flex items-center space-x-2 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span>Email Week</span>
                      </button>
                    </div>
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
                      <div key={dayIndex} className="min-h-[600px] border-r border-b last:border-r-0 relative overflow-visible">
                        {/* Date Header */}
                        <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-2 border-b border-gray-100">
                          <span className="text-sm font-medium text-gray-900">
                            {day.date.getDate()}
                          </span>
                          {day.games.length > 0 && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                              {day.games.length}
                            </span>
                          )}
                        </div>

                        {/* Time Grid Lines */}
                        <div className="absolute inset-0 top-10 pointer-events-none">
                          {timeGridLines.map((line, lineIndex) => (
                            <div
                              key={lineIndex}
                              className="absolute w-full border-t border-gray-100"
                              style={{ top: `${line.position}%` }}
                            >
                              <span className="text-xs text-gray-400 bg-white px-1 -mt-2 absolute left-1">
                                {line.label}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Games positioned by time */}
                        <div className="relative pt-2 overflow-visible" style={{ height: 'calc(100% - 40px)' }}>
                          {day.games.map((game) => {
                            const position = getGamePosition(game, day.games)
                            return (
                              <GameCalendarCard
                                key={game.gameId}
                                game={game}
                                position={position}
                                onGameClick={openGameModal}
                              />
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generated Calendar Section */}
                {generatedCalendar && (
                  <div className="mt-8">
                    <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-t-lg">
                      <h3 className="text-xl font-semibold flex items-center">
                        <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        AI-Optimized Calendar
                      </h3>
                      <p className="text-purple-100 text-sm mt-1">{generatedCalendar.weekSummary}</p>
                    </div>

                    {/* Optimized Calendar Grid */}
                    <div className="bg-white rounded-b-lg shadow-sm overflow-hidden">
                      {/* Day Headers */}
                      <div className="grid grid-cols-7 bg-purple-50 border-b">
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                          <div key={day} className="p-4 text-center font-semibold text-purple-700 border-r last:border-r-0">
                            <div className="hidden sm:block">{day}</div>
                            <div className="sm:hidden">{day.slice(0, 3)}</div>
                          </div>
                        ))}
                      </div>

                      {/* Calendar Days with Optimized Colors */}
                      <div className="grid grid-cols-7">
                        {weeks[currentWeek].days.map((day, dayIndex) => (
                          <div key={dayIndex} className="min-h-[600px] border-r border-b last:border-r-0 relative overflow-visible">
                            {/* Date Header */}
                            <div className="sticky top-0 bg-white z-10 flex justify-between items-center p-2 border-b border-gray-100">
                              <span className="text-sm font-medium text-gray-900">
                                {day.date.getDate()}
                              </span>
                              {day.games.length > 0 && (
                                <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                                  {day.games.length}
                                </span>
                              )}
                            </div>

                            {/* Time Grid Lines */}
                            <div className="absolute inset-0 top-10 pointer-events-none">
                              {timeGridLines.map((line, lineIndex) => (
                                <div
                                  key={lineIndex}
                                  className="absolute w-full border-t border-gray-100"
                                  style={{ top: `${line.position}%` }}
                                >
                                  <span className="text-xs text-gray-400 bg-white px-1 -mt-2 absolute left-1">
                                    {line.label}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* TV-based side-by-side timeline view - Improved Readability */}
                            <div className="pt-4 overflow-auto" style={{ height: 'calc(100% - 40px)' }}>
                              <div className="grid gap-4 min-h-full" style={{ gridTemplateColumns: `repeat(${Math.min(Object.keys(generatedCalendar.tvSchedule).length, 3)}, 1fr)` }}>
                                {Object.entries(generatedCalendar.tvSchedule).map(([tvNumber, tvGames]) => {
                                  // Filter games for this specific day
                                  const dayTvGames = (tvGames as Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string; assignedDate?: string; assignedTimeSlot?: string }>)
                                    .filter(game => {
                                      const gameDate = new Date(game.gameDateEst).toDateString()
                                      return gameDate === day.date.toDateString()
                                    })
                                    .sort((a, b) => a.gameStatusText.localeCompare(b.gameStatusText))
                                  
                                  return (
                                    <div key={`tv-${tvNumber}-${day.date.toDateString()}`} className="bg-white rounded-xl p-4 border-2 border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                      {/* TV Header */}
                                      <div className="flex items-center justify-center mb-4">
                                        <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-sm">
                                          📺 TV {tvNumber}
                                        </div>
                                      </div>
                                      
                                      {/* Games Timeline */}
                                      {dayTvGames.length === 0 ? (
                                        <div className="flex items-center justify-center py-8 text-gray-400 bg-gray-50 rounded-lg">
                                          <div className="text-center">
                                            <div className="text-2xl mb-2">📺</div>
                                            <div className="text-sm font-medium">No games scheduled</div>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="space-y-3">
                                          {dayTvGames.map((game, gameIndex) => (
                                            <div key={`${game.gameId}-${gameIndex}`}>
                                              {/* Game Card */}
                                              <div 
                                                className="p-3 rounded-lg cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm border-2 border-transparent hover:border-white"
                                                style={{ backgroundColor: game.color }}
                                                onClick={() => openGameModal(game)}
                                                title={`${game.reasoning} | Priority: ${game.priority}/10`}
                                              >
                                                <div className="text-white">
                                                  <div className="font-bold text-center text-sm mb-1">
                                                    {game.awayTeam.teamTricode} @ {game.homeTeam.teamTricode}
                                                  </div>
                                                  <div className="text-xs text-center opacity-90 font-medium">
                                                    {game.assignedTimeSlot || game.gameStatusText}
                                                  </div>
                                                  <div className="text-xs text-center opacity-75 mt-1">
                                                    Priority: {game.priority}/10
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Transition Arrow */}
                                              {gameIndex < dayTvGames.length - 1 && (
                                                <div className="flex justify-center py-2">
                                                  <div className="flex items-center space-x-1 text-gray-500">
                                                    <div className="w-8 h-px bg-gray-300"></div>
                                                    <div className="text-lg">⬇️</div>
                                                    <div className="w-8 h-px bg-gray-300"></div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                      
                                      {/* TV Summary */}
                                      {dayTvGames.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-gray-200">
                                          <div className="text-xs text-gray-600 text-center">
                                            <span className="font-medium">{dayTvGames.length} game{dayTvGames.length !== 1 ? 's' : ''}</span>
                                            {dayTvGames.length > 1 && <span> with transitions</span>}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* TV Legend */}
                    <div className="mt-4 bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-3">TV Assignments & Priority Legend</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        {/* TV Assignments */}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">TV Assignments</h5>
                          <div className="space-y-1">
                            {Object.entries(generatedCalendar.tvSchedule).map(([tvNumber, games]) => {
                              const gamesList = games as Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string }>
                              const gameNames = gamesList.map(g => `${g.awayTeam.teamTricode}@${g.homeTeam.teamTricode}`).join(', ')
                              return (
                                <div key={tvNumber} className="flex items-center space-x-2 text-sm">
                                  <div className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold">
                                    TV{tvNumber}
                                  </div>
                                  <span className="text-gray-600 text-xs">{gameNames || 'No games'}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Priority Colors */}
                        <div>
                          <h5 className="font-medium text-gray-700 mb-2">Game Priority Colors</h5>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2 text-sm">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(0, 165, 255)' }}></div>
                              <span>High Priority</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(128, 210, 128)' }}></div>
                              <span>Medium Priority</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm">
                              <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(255, 255, 0)' }}></div>
                              <span>Lower Priority</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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
                    {gameDate.games.map((game) => (
                      <div 
                        key={game.gameId} 
                        className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-blue-300"
                        onClick={() => openGameModal(game)}
                      >
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

        {/* Game Details Modal */}
        {isModalOpen && selectedGame && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900">Game Details</h2>
                <button
                  onClick={closeGameModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Game Status and Time */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center space-x-3 bg-blue-50 px-4 py-2 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {selectedGame.gameStatusText}
                    </div>
                    <div className="text-gray-600">
                      {formatDate(selectedGame.gameDateEst)}
                    </div>
                  </div>
                </div>

                {/* Teams Section */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">Matchup</h3>
                  <div className="flex items-center justify-between">
                    {/* Away Team */}
                    <div className="text-center flex-1">
                      <div className="text-sm text-gray-500 mb-1">Away</div>
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        {selectedGame.awayTeam.teamCity} {selectedGame.awayTeam.teamName}
                      </div>
                      <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded font-mono text-sm">
                        {selectedGame.awayTeam.teamTricode}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {selectedGame.awayTeam.wins}-{selectedGame.awayTeam.losses}
                      </div>
                    </div>

                    {/* VS */}
                    <div className="px-6">
                      <div className="text-2xl font-bold text-gray-400">VS</div>
                    </div>

                    {/* Home Team */}
                    <div className="text-center flex-1">
                      <div className="text-sm text-gray-500 mb-1">Home</div>
                      <div className="text-xl font-bold text-gray-900 mb-1">
                        {selectedGame.homeTeam.teamCity} {selectedGame.homeTeam.teamName}
                      </div>
                      <div className="bg-gray-200 text-gray-700 px-3 py-1 rounded font-mono text-sm">
                        {selectedGame.homeTeam.teamTricode}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        {selectedGame.homeTeam.wins}-{selectedGame.homeTeam.losses}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Game Info Grid */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  {/* Venue Information */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Venue
                    </h4>
                    <div className="space-y-2">
                      <div className="font-medium text-gray-900">{selectedGame.arenaName}</div>
                      <div className="text-gray-600">
                        {selectedGame.arenaCity}
                        {selectedGame.arenaState && `, ${selectedGame.arenaState}`}
                      </div>
                      {selectedGame.isNeutral && (
                        <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm">
                          Neutral Site
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Game Type */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Game Type
                    </h4>
                    <div className="space-y-2">
                      <div className="inline-flex items-center bg-orange-100 text-orange-800 px-3 py-1 rounded font-medium">
                        {selectedGame.gameLabel}
                      </div>
                      {selectedGame.gameSubLabel && (
                        <div className="text-gray-600 font-medium">
                          {selectedGame.gameSubLabel}
                        </div>
                      )}
                      {selectedGame.seriesText && (
                        <div className="text-gray-600 text-sm">
                          {selectedGame.seriesText}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Broadcast Information */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Broadcast Information
                  </h4>
                  
                  {getAllBroadcasters(selectedGame.broadcasters).length > 0 ? (
                    <div className="grid gap-3">
                      {/* National Broadcasters */}
                      {selectedGame.broadcasters.nationalBroadcasters.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">National TV</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedGame.broadcasters.nationalBroadcasters.map((broadcaster, idx) => (
                              <span key={idx} className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium">
                                {broadcaster.broadcasterDisplay}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Home TV Broadcasters */}
                      {selectedGame.broadcasters.homeTvBroadcasters.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Home TV</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedGame.broadcasters.homeTvBroadcasters.map((broadcaster, idx) => (
                              <span key={idx} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium">
                                {broadcaster.broadcasterDisplay}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Home Radio Broadcasters */}
                      {selectedGame.broadcasters.homeRadioBroadcasters.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Home Radio</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedGame.broadcasters.homeRadioBroadcasters.map((broadcaster, idx) => (
                              <span key={idx} className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm font-medium">
                                {broadcaster.broadcasterDisplay}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Away TV Broadcasters */}
                      {selectedGame.broadcasters.awayTvBroadcasters.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Away TV</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedGame.broadcasters.awayTvBroadcasters.map((broadcaster, idx) => (
                              <span key={idx} className="bg-orange-100 text-orange-800 px-3 py-1 rounded text-sm font-medium">
                                {broadcaster.broadcasterDisplay}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Away Radio Broadcasters */}
                      {selectedGame.broadcasters.awayRadioBroadcasters.length > 0 && (
                        <div>
                          <div className="text-sm font-medium text-gray-700 mb-1">Away Radio</div>
                          <div className="flex flex-wrap gap-2">
                            {selectedGame.broadcasters.awayRadioBroadcasters.map((broadcaster, idx) => (
                              <span key={idx} className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm font-medium">
                                {broadcaster.broadcasterDisplay}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <span>Broadcast information to be determined</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end p-6 border-t border-gray-200">
                <button
                  onClick={closeGameModal}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generate Calendar Modal */}
        {isGenerateModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Generate Optimized Calendar</h2>
                <button
                  onClick={closeGenerateModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {!generatedCalendar ? (
                  <div>
                    <div className="mb-4">
                      <p className="text-gray-600 mb-4">
                        Generate an optimized viewing calendar for <strong>{weeks[currentWeek] && formatWeekRange(weeks[currentWeek].weekStart, weeks[currentWeek].weekEnd)}</strong> based on your preferences.
                      </p>
                      
                      {userPreferences ? (
                        <div className="bg-blue-50 p-4 rounded-lg mb-4">
                          <h4 className="font-semibold text-blue-900 mb-2">Your Preferences:</h4>
                          <div className="text-sm text-blue-800 space-y-1">
                            <div>TVs Available: {userPreferences.numberOfTvs}</div>
                            <div>Favorite Teams: {userPreferences.favoriteNbaTeams?.length ? userPreferences.favoriteNbaTeams.join(', ') : 'None selected'}</div>
                            {userPreferences.zipCode && <div>Location: {userPreferences.zipCode}</div>}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-yellow-50 p-4 rounded-lg mb-4">
                          <div className="flex items-center space-x-2">
                            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <span className="text-yellow-800 font-medium">Please set your preferences first to get personalized recommendations.</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {generateStatus && (
                      <div className={`mb-4 p-3 rounded-lg ${
                        generateStatus.type === 'success' 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        <div className="flex items-center space-x-2">
                          {generateStatus.type === 'success' ? (
                            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          <span className="text-sm">{generateStatus.message}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={closeGenerateModal}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        disabled={isGenerating}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={generateOptimizedCalendar}
                        disabled={isGenerating || !userPreferences}
                        className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                          isGenerating || !userPreferences
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-purple-600 text-white hover:bg-purple-700'
                        }`}
                      >
                        {isGenerating ? (
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </div>
                        ) : (
                          'Generate Calendar'
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {/* Generated Calendar Results */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Optimized Viewing Plan</h3>
                      <p className="text-gray-600">{generatedCalendar.weekSummary}</p>
                    </div>

                    {/* TV Schedule */}
                    <div className="grid gap-6 mb-6">
                      {Object.entries(generatedCalendar.tvSchedule).map(([tvNumber, games]) => {
                        const gamesList = games as Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string }>
                        return (
                        <div key={tvNumber} className="bg-gray-50 rounded-lg p-4">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                            <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            TV {tvNumber} ({gamesList.length} games)
                          </h4>
                          <div className="space-y-2">
                            {gamesList.map((game) => (
                              <div key={game.gameId} className="bg-white rounded-lg p-3 border-l-4" style={{ borderLeftColor: game.color }}>
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="font-medium text-gray-900">
                                      {game.awayTeam.teamTricode} @ {game.homeTeam.teamTricode}
                                    </div>
                                    <div className="text-sm text-gray-600">
                                      {game.gameStatusText}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: game.color }}></div>
                                  </div>
                                </div>
                                {game.reasoning && !game.reasoning.includes('duplicate') && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {game.reasoning}
                                  </div>
                                )}
                              </div>
                            ))}
                            {gamesList.length === 0 && (
                              <div className="text-gray-500 text-center py-4">No games assigned to this TV</div>
                            )}
                          </div>
                        </div>
                        )
                      })}
                    </div>

                    {/* Multiple TV Broadcasts */}
                    {(() => {
                      // Find games that appear on multiple TVs
                      const gameOccurrences = new Map<string, number[]>()
                      Object.entries(generatedCalendar.tvSchedule).forEach(([tvNumber, games]) => {
                        const gamesList = games as Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string }>
                        gamesList.forEach(game => {
                          const key = `${game.awayTeam.teamTricode}-${game.homeTeam.teamTricode}-${game.gameStatusText}`
                          if (!gameOccurrences.has(key)) {
                            gameOccurrences.set(key, [])
                          }
                          gameOccurrences.get(key)!.push(parseInt(tvNumber))
                        })
                      })

                      const duplicatedGames = Array.from(gameOccurrences.entries())
                        .filter(([_, tvs]) => tvs.length > 1)
                        .map(([gameKey, tvs]) => ({ gameKey, tvs: tvs.sort((a, b) => a - b) }))

                      if (duplicatedGames.length === 0) return null

                      return (
                        <div className="bg-blue-50 rounded-lg p-4 mb-6">
                          <h4 className="font-semibold text-blue-900 mb-3">TVs Also Showing Same Broadcasts</h4>
                          <div className="space-y-2">
                            {duplicatedGames.map(({ gameKey, tvs }) => {
                              const [awayTeam, homeTeam] = gameKey.split('-')
                              return (
                                <div key={gameKey} className="flex items-center justify-between text-sm">
                                  <span className="text-blue-800 font-medium">
                                    {awayTeam} @ {homeTeam}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-blue-600">TVs:</span>
                                    {tvs.map((tv, index) => (
                                      <span key={tv} className="bg-blue-200 text-blue-800 px-2 py-1 rounded text-xs font-bold">
                                        {tv}{index < tvs.length - 1 ? ',' : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}

                    {/* Daily TV Programming Guide */}
                    <div className="bg-green-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-green-900 mb-3">📺 Daily TV Programming Guide</h4>
                      <div className="space-y-4">
                        {weeks[currentWeek].days.map((day, dayIndex) => {
                          const dayName = day.date.toLocaleDateString('en-US', { weekday: 'long' })
                          const dayGames = day.games
                          
                          if (dayGames.length === 0) {
                            return (
                              <div key={dayIndex} className="bg-white rounded-lg p-3 border border-green-200">
                                <h5 className="font-semibold text-green-800 mb-2">{dayName} - {day.date.toLocaleDateString()}</h5>
                                <p className="text-green-600 text-sm">No games scheduled</p>
                              </div>
                            )
                          }

                          // Sort games by time for this day
                          const sortedDayGames = [...dayGames].sort((a, b) => a.gameStatusText.localeCompare(b.gameStatusText))
                          
                          // Create TV schedule for this day
                          const tvScheduleForDay: { [tvNumber: number]: Array<{ game: any; timeSlot: string }> } = {}
                          
                          // Initialize all TVs
                          for (let i = 1; i <= (userPreferences?.numberOfTvs || 1); i++) {
                            tvScheduleForDay[i] = []
                          }
                          
                          // Distribute games throughout the day
                          sortedDayGames.forEach((game, gameIndex) => {
                            const gameStartTime = game.gameStatusText
                            
                            // Calculate which TVs should show this game
                            const numTvs = userPreferences?.numberOfTvs || 1
                            
                            if (sortedDayGames.length === 1) {
                              // One game - all TVs show it
                              for (let tv = 1; tv <= numTvs; tv++) {
                                tvScheduleForDay[tv].push({
                                  game,
                                  timeSlot: `${gameStartTime} - ${getEndTime(gameStartTime)}`
                                })
                              }
                            } else if (sortedDayGames.length === 2) {
                              // Two games - split TVs
                              const tvsPerGame = Math.ceil(numTvs / 2)
                              const startTv = gameIndex === 0 ? 1 : tvsPerGame + 1
                              const endTv = gameIndex === 0 ? tvsPerGame : numTvs
                              
                              for (let tv = startTv; tv <= endTv; tv++) {
                                tvScheduleForDay[tv].push({
                                  game,
                                  timeSlot: `${gameStartTime} - ${getEndTime(gameStartTime)}`
                                })
                              }
                            } else {
                              // Multiple games - round robin
                              const tvNumber = (gameIndex % numTvs) + 1
                              tvScheduleForDay[tvNumber].push({
                                game,
                                timeSlot: `${gameStartTime} - ${getEndTime(gameStartTime)}`
                              })
                            }
                          })

                          return (
                            <div key={dayIndex} className="bg-white rounded-lg p-3 border border-green-200">
                              <h5 className="font-semibold text-green-800 mb-3">{dayName} - {day.date.toLocaleDateString()}</h5>
                              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                                {Object.entries(tvScheduleForDay).map(([tvNum, schedule]) => (
                                  <div key={tvNum} className="bg-gray-50 rounded p-2">
                                    <div className="font-bold text-gray-800 mb-1">TV {tvNum}</div>
                                    {schedule.length > 0 ? (
                                      schedule.map((item, idx) => (
                                        <div key={idx} className="text-gray-600 mb-1">
                                          <div className="font-medium">{item.timeSlot}</div>
                                          <div>{item.game.awayTeam.teamTricode} @ {item.game.homeTeam.teamTricode}</div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="text-gray-400">No games</div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="bg-blue-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-blue-900 mb-2">AI Recommendations</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        {generatedCalendar.recommendations.map((rec: string, index: number) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-blue-600">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Color Legend */}
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-gray-900 mb-2">Priority Color Scale</h4>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(0, 165, 255)' }}></div>
                          <span>High Priority</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(128, 210, 128)' }}></div>
                          <span>Medium Priority</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: 'rgb(255, 255, 0)' }}></div>
                          <span>Low Priority</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setGeneratedCalendar(null)
                          setGenerateStatus(null)
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Generate New
                      </button>
                      <button
                        onClick={closeGenerateModal}
                        className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Email Modal */}
        {isEmailModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full">
              {/* Modal Header */}
              <div className="flex justify-between items-center p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Email Weekly Schedule</h2>
                <button
                  onClick={closeEmailModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                <div className="mb-4">
                  <p className="text-gray-600 mb-4">
                    Send the schedule for <strong>{weeks[currentWeek] && formatWeekRange(weeks[currentWeek].weekStart, weeks[currentWeek].weekEnd)}</strong> to your email.
                  </p>
                  
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                    disabled={isEmailSending}
                  />
                </div>

                {emailStatus && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    emailStatus.type === 'success' 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      {emailStatus.type === 'success' ? (
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className="text-sm">{emailStatus.message}</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeEmailModal}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    disabled={isEmailSending}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={sendWeeklyEmail}
                    disabled={isEmailSending || !emailAddress}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                      isEmailSending || !emailAddress
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {isEmailSending ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      'Send Email'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
