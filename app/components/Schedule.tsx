'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { GameCalendarCard } from './GameCalendarCard'

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
  const router = useRouter()
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'tv-day'>('calendar')
  const [currentWeek, setCurrentWeek] = useState(0)
  const [currentDay, setCurrentDay] = useState(0) // For TV day view
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
  const [selectedTvTab, setSelectedTvTab] = useState(1)
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

  // Load user preferences from localStorage on component mount
  useEffect(() => {
    const loadPreferences = () => {
      if (typeof window === 'undefined') return
      
      try {
        const stored = localStorage.getItem('sports-scheduler-user-preferences')
        if (stored) {
          const preferences = JSON.parse(stored)
          setUserPreferences(preferences)
        }
      } catch (error) {
        console.error('Failed to load preferences from localStorage:', error)
      }
    }

    loadPreferences()

    // Listen for storage changes (when preferences are updated in settings page)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sports-scheduler-user-preferences' && e.newValue) {
        try {
          const preferences = JSON.parse(e.newValue)
          setUserPreferences(preferences)
        } catch (error) {
          console.error('Failed to parse preferences from storage event:', error)
        }
      }
    }

    // Listen for window focus to reload preferences when returning from settings
    const handleWindowFocus = () => {
      loadPreferences()
    }

    // Listen for visibility change (when user returns to this tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadPreferences()
      }
    }

    // Listen for custom preference update events
    const handlePreferenceUpdate = () => {
      loadPreferences()
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('preferencesUpdated', handlePreferenceUpdate)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('preferencesUpdated', handlePreferenceUpdate)
    }
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

  // Get all game dates for TV day view
  const getAllGameDates = () => {
    if (!scheduleData) return []
    
    const allDates: Array<{
      date: Date
      games: Game[]
      dateString: string
    }> = []
    
    scheduleData.leagueSchedule.gameDates.forEach(gameDate => {
      // Convert from "MM/DD/YYYY HH:MM:SS" to proper date
      const datePart = gameDate.gameDate.split(' ')[0] // Get "MM/DD/YYYY"
      const [month, day, year] = datePart.split('/')
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
      
      allDates.push({
        date,
        games: gameDate.games,
        dateString: date.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })
      })
    })
    
    // Sort by date
    allDates.sort((a, b) => a.date.getTime() - b.date.getTime())
    return allDates
  }

  const allGameDates = getAllGameDates()
  const totalDays = allGameDates.length

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

  // TV Day view navigation
  const goToPrevDay = () => {
    if (currentDay > 0) {
      setCurrentDay(currentDay - 1)
    }
  }

  const goToNextDay = () => {
    if (currentDay < totalDays - 1) {
      setCurrentDay(currentDay + 1)
    }
  }

  // Convert priority (1-10) to star rating (1-5)
  const getStarRating = (priority: number) => {
    // Convert 1-10 scale to 1-5 stars
    return Math.max(1, Math.min(5, Math.ceil(priority / 2)))
  }

  // Star Rating Component
  const StarRating = ({ rating, className = "" }: { rating: number, className?: string }) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`w-5 h-5 ${i <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} ${className}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      )
    }
    return <div className="flex items-center space-x-1">{stars}</div>
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

  // Send optimized calendar via email
  const sendOptimizedCalendarEmail = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      setEmailStatus({ type: 'error', message: 'Please enter a valid email address' })
      return
    }

    if (!generatedCalendar) {
      setEmailStatus({ type: 'error', message: 'No optimized calendar available' })
      return
    }

    if (!weeks[currentWeek]) {
      setEmailStatus({ type: 'error', message: 'No week data available' })
      return
    }

    setIsEmailSending(true)
    setEmailStatus(null)

    try {
      const weekData = {
        weekStart: weeks[currentWeek].weekStart.toISOString(),
        weekEnd: weeks[currentWeek].weekEnd.toISOString(),
        games: generatedCalendar.optimizedGames,
        tvSchedule: generatedCalendar.tvSchedule,
        recommendations: generatedCalendar.recommendations,
        weekSummary: generatedCalendar.weekSummary,
        isOptimized: true
      }

      const response = await fetch('/api/email-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekData,
          recipientEmail: emailAddress,
          isOptimizedCalendar: true
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email')
      }

      setEmailStatus({ 
        type: 'success', 
        message: `Optimized viewing plan sent successfully to ${emailAddress}!` 
      })
      
      // Close email input after 2 seconds
      setTimeout(() => {
        setEmailStatus(null)
        setEmailAddress('')
      }, 3000)

    } catch (error) {
      setEmailStatus({ 
        type: 'error', 
        message: error instanceof Error ? error.message : 'Failed to send email' 
      })
    } finally {
      setIsEmailSending(false)
    }
  }

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
        <p className="mt-4 text-gray-600">Loading Automated TV Plan Scheduler...</p>
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
        <header className="relative text-center mb-8">
          {/* Settings Icon */}
          <div className="absolute top-0 right-0">
            <button
              onClick={() => router.push('/settings')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Automated TV Plan Scheduler
          </h1>
          <p className="text-gray-600 mb-4">
            Last updated: {new Date(scheduleData.meta.time).toLocaleString()}
          </p>
        </header>

          
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
                📅 Calendar View
              </button>
              <button
                onClick={() => setViewMode('tv-day')}
                className={`px-3 py-2 rounded-md font-medium transition-colors text-sm ${
                  viewMode === 'tv-day'
                    ? 'bg-gray-50 text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📺 TV View
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-md font-medium transition-colors text-sm ${
                  viewMode === 'list'
                    ? 'bg-gray-50 text-gray-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📋 List View
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

                {/* Optimized Viewing Plan - Text Display */}
                {generatedCalendar && (
                  <div className="mt-8">
                    <div className="bg-gradient-to-r from-red-200 via-yellow-200 via-green-200 via-blue-200 via-indigo-200 to-purple-200 text-gray-800 p-6 rounded-t-lg">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-2xl font-bold flex items-center mb-2">
                            <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span className="bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Optimized Viewing Plan</span>
                          </h3>
                          <p className="text-gray-700">{generatedCalendar.weekSummary}</p>
                        </div>
                        
                        {/* Email Button */}
                        <div className="ml-4 flex-shrink-0">
                          <button
                            onClick={() => {
                              // Scroll to email section or show inline email form
                              const emailSection = document.getElementById('email-optimized-plan')
                              if (emailSection) {
                                emailSection.scrollIntoView({ behavior: 'smooth' })
                                emailSection.classList.add('animate-pulse')
                                setTimeout(() => emailSection.classList.remove('animate-pulse'), 2000)
                              }
                            }}
                            className="bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700 px-4 py-2 rounded-lg transition-all duration-200 flex items-center space-x-2 text-sm font-medium shadow-md"
                            title="Email this viewing plan"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span>Email Plan</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-b-lg shadow-sm">
                      {/* TV Tabs */}
                      <div className="flex border-b border-gray-200 overflow-x-auto">
                        {Object.entries(generatedCalendar.tvSchedule)
                          .sort(([a], [b]) => parseInt(a) - parseInt(b))
                          .map(([tvNumber, games]) => {
                            const gamesList = games as Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string; assignedDate?: string; assignedTimeSlot?: string }>
                            const isActive = parseInt(tvNumber) === selectedTvTab
                            return (
                              <button
                                key={tvNumber}
                                onClick={() => setSelectedTvTab(parseInt(tvNumber))}
                                className={`flex-shrink-0 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                                  isActive
                                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <span className="text-lg">📺</span>
                                  <span>TV {tvNumber}</span>
                                  <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded-full text-xs">
                                    {gamesList.length}
                                  </span>
                                </div>
                              </button>
                            )
                          })
                        }
                      </div>

                      {/* Selected TV Content */}
                      <div className="p-6">
                        {(() => {
                          const selectedTvGames = generatedCalendar.tvSchedule[selectedTvTab] as Array<Game & { priority: number; tvAssignment: number; color: string; reasoning: string; assignedDate?: string; assignedTimeSlot?: string }>
                          
                          if (!selectedTvGames || selectedTvGames.length === 0) {
                            return (
                              <div className="text-center py-12">
                                <div className="text-4xl mb-4">📺</div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Games Assigned</h3>
                                <p className="text-gray-500">TV {selectedTvTab} has no games scheduled</p>
                              </div>
                            )
                          }

                          return (
                            <div>
                              {/* TV Header */}
                              <div className="mb-6 pb-4 border-b border-gray-100">
                                <h3 className="text-2xl font-bold text-gray-900 flex items-center">
                                  <div className="bg-gray-800 text-white px-4 py-2 rounded-lg mr-4">
                                    📺 TV {selectedTvTab}
                                  </div>
                                  <span className="text-gray-600">({selectedTvGames.length} games)</span>
                                </h3>
                              </div>

                              {/* Games List */}
                              <div className="space-y-4">
                                {selectedTvGames
                                  .sort((a, b) => {
                                    // Sort by assigned date, then by time
                                    const dateA = a.assignedDate || a.gameDateEst
                                    const dateB = b.assignedDate || b.gameDateEst
                                    if (dateA !== dateB) return dateA.localeCompare(dateB)
                                    return a.gameStatusText.localeCompare(b.gameStatusText)
                                  })
                                  .map((game, index) => (
                                    <div 
                                      key={`${game.gameId}-${index}`}
                                      className="bg-gray-50 rounded-lg p-5 hover:bg-gray-100 transition-colors cursor-pointer border-l-4 border-blue-500"
                                      onClick={() => openGameModal(game)}
                                    >
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-3 mb-3">
                                            {/* Day Badge */}
                                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                              {new Date(game.assignedDate || game.gameDateEst).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                                            </span>
                                            <div className="text-2xl font-bold text-gray-900">
                                              {game.awayTeam.teamTricode} @ {game.homeTeam.teamTricode}
                                            </div>
                                          </div>
                                          
                                          <div className="text-lg text-gray-700 font-medium mb-3">
                                            {game.assignedTimeSlot || game.gameStatusText}
                                          </div>
                                          
                                          <div className="text-sm text-gray-600 bg-white rounded-lg px-4 py-3 italic">
                                            &ldquo;{game.reasoning}&rdquo;
                                          </div>
                                        </div>
                                        
                                        <div className="ml-6 flex flex-col items-end">
                                          <StarRating rating={getStarRating(game.priority)} />
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                }
                              </div>
                            </div>
                          )
                        })()}
                      </div>

                      {/* AI Recommendations */}
                      <div className="mt-8 bg-blue-50 rounded-lg p-6">
                        <h4 className="text-lg font-bold text-blue-900 mb-4">AI Recommendations</h4>
                        <ul className="space-y-2">
                          {generatedCalendar.recommendations.map((rec: string, index: number) => (
                            <li key={index} className="flex items-start space-x-3">
                              <span className="text-blue-600 font-bold">•</span>
                              <span className="text-blue-800">{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Email Section */}
                      <div id="email-optimized-plan" className="mt-8 bg-green-50 rounded-lg p-6">
                        <h4 className="text-lg font-bold text-green-900 mb-4 flex items-center">
                          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          📧 Email This Viewing Plan
                        </h4>
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="email"
                            placeholder="Enter your email address"
                            value={emailAddress}
                            onChange={(e) => setEmailAddress(e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-base"
                          />
                          <button
                            onClick={sendOptimizedCalendarEmail}
                            disabled={isEmailSending || !emailAddress}
                            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2 text-base"
                          >
                            {isEmailSending ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>Sending...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span>Send Email</span>
                              </>
                            )}
                          </button>
                        </div>
                        
                        {/* Email Status */}
                        {emailStatus && (
                          <div className={`mt-4 p-4 rounded-lg ${
                            emailStatus.type === 'success' 
                              ? 'bg-green-100 text-green-800 border border-green-200' 
                              : 'bg-red-100 text-red-800 border border-red-200'
                          }`}>
                            <div className="flex items-center space-x-2">
                              {emailStatus.type === 'success' ? (
                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                              )}
                              <span className="font-medium">{emailStatus.message}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : viewMode === 'tv-day' ? (
          // TV Day View - Optimized for Television Displays
          <div>
            {allGameDates.length > 0 && (
              <>
                {/* Day Navigation */}
                <div className="flex justify-between items-center mb-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg shadow-lg">
                  <button
                    onClick={goToPrevDay}
                    disabled={currentDay === 0}
                    className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-bold text-lg transition-colors ${
                      currentDay === 0
                        ? 'bg-black bg-opacity-20 text-gray-300 cursor-not-allowed'
                        : 'bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm'
                    }`}
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Previous Day</span>
                  </button>

                  <div className="text-center">
                    <h1 className="text-3xl font-bold mb-2">
                      📺 {allGameDates[currentDay]?.dateString}
                    </h1>
                    <p className="text-blue-100 text-lg font-medium">
                      Day {currentDay + 1} of {totalDays} • {allGameDates[currentDay]?.games.length} games today
                    </p>
                  </div>

                  <button
                    onClick={goToNextDay}
                    disabled={currentDay === totalDays - 1}
                    className={`flex items-center space-x-3 px-6 py-3 rounded-lg font-bold text-lg transition-colors ${
                      currentDay === totalDays - 1
                        ? 'bg-black bg-opacity-20 text-gray-300 cursor-not-allowed'
                        : 'bg-white bg-opacity-20 hover:bg-opacity-30 backdrop-blur-sm'
                    }`}
                  >
                    <span>Next Day</span>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>

                {/* TV-Optimized Game Cards */}
                {allGameDates[currentDay]?.games.length === 0 ? (
                  <div className="text-center py-20">
                    <div className="text-6xl mb-4">📺</div>
                    <h2 className="text-3xl font-bold text-gray-600 mb-2">No Games Today</h2>
                    <p className="text-xl text-gray-500">Check back tomorrow for more games!</p>
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
                    {allGameDates[currentDay]?.games.map((game) => (
                      <div 
                        key={game.gameId}
                        className="bg-white rounded-2xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-300 transform hover:scale-105 cursor-pointer border-4 border-transparent hover:border-blue-500"
                        onClick={() => openGameModal(game)}
                      >
                        {/* Game Header - Large and Bold for TV */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                          <div className="text-center">
                            <div className="text-4xl font-black mb-2">
                              {formatGameTime(game.gameStatusText)}
                            </div>
                            {game.gameSubLabel && (
                              <div className="bg-orange-500 text-white px-4 py-2 rounded-full text-lg font-bold inline-block">
                                {game.gameSubLabel}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Teams Section - Extra Large for TV Viewing */}
                        <div className="p-8">
                          <div className="flex items-center justify-between mb-6">
                            {/* Away Team */}
                            <div className="text-center flex-1">
                              <div className="text-sm text-gray-500 font-medium mb-2">AWAY</div>
                              <div className="text-2xl font-black text-gray-900 mb-2">
                                {game.awayTeam.teamTricode}
                              </div>
                              <div className="text-lg text-gray-700 font-medium">
                                {game.awayTeam.teamCity}
                              </div>
                              <div className="text-lg text-gray-700 font-medium">
                                {game.awayTeam.teamName}
                              </div>
                              <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-lg font-bold mt-2">
                                {game.awayTeam.wins}-{game.awayTeam.losses}
                              </div>
                            </div>

                            {/* VS Divider */}
                            <div className="px-6">
                              <div className="text-4xl font-black text-gray-400">@</div>
                            </div>

                            {/* Home Team */}
                            <div className="text-center flex-1">
                              <div className="text-sm text-gray-500 font-medium mb-2">HOME</div>
                              <div className="text-2xl font-black text-gray-900 mb-2">
                                {game.homeTeam.teamTricode}
                              </div>
                              <div className="text-lg text-gray-700 font-medium">
                                {game.homeTeam.teamCity}
                              </div>
                              <div className="text-lg text-gray-700 font-medium">
                                {game.homeTeam.teamName}
                              </div>
                              <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg text-lg font-bold mt-2">
                                {game.homeTeam.wins}-{game.homeTeam.losses}
                              </div>
                            </div>
                          </div>

                          {/* Venue Information - Large Text */}
                          <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <div className="flex items-center justify-center space-x-3">
                              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <div className="text-center">
                                <div className="text-lg font-bold text-gray-900">{game.arenaName}</div>
                                <div className="text-base text-gray-600">
                                  {game.arenaCity}{game.arenaState && `, ${game.arenaState}`}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Broadcast Information - Prominent for TV */}
                          <div className="bg-green-50 rounded-lg p-4">
                            <div className="flex items-center justify-center space-x-3 mb-3">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              <span className="text-lg font-bold text-green-800">WATCH ON</span>
                            </div>
                            
                            {getAllBroadcasters(game.broadcasters).length > 0 ? (
                              <div className="flex flex-wrap gap-2 justify-center">
                                {getAllBroadcasters(game.broadcasters).slice(0, 4).map((broadcaster, idx) => (
                                  <span key={idx} className="bg-green-600 text-white px-4 py-2 rounded-full text-base font-bold">
                                    {broadcaster}
                                  </span>
                                ))}
                                {getAllBroadcasters(game.broadcasters).length > 4 && (
                                  <span className="bg-green-500 text-white px-4 py-2 rounded-full text-base font-bold">
                                    +{getAllBroadcasters(game.broadcasters).length - 4} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="text-center">
                                <span className="bg-gray-400 text-white px-4 py-2 rounded-full text-base font-bold">
                                  TBD
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Game Duration Info */}
                          <div className="mt-4 text-center">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="text-sm text-blue-600 font-medium mb-1">ESTIMATED DURATION</div>
                              <div className="text-lg font-bold text-blue-800">
                                {formatGameTime(game.gameStatusText)} - {getEndTime(game.gameStatusText)}
                              </div>
                              <div className="text-sm text-blue-600">~3.5 hours including coverage</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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
                          <div className="flex items-center justify-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-4 border-white border-r-transparent"></div>
                            <span className="font-medium">Generating AI Calendar...</span>
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
                      <h3 className="text-lg font-semibold mb-2">
                        <span className="bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">Optimized Viewing Plan</span>
                      </h3>
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
                                    <div className="text-lg" title={`Priority: ${game.priority}/10`}>
                                      {'⭐'.repeat(Math.max(1, Math.min(5, Math.round(game.priority / 2))))}
                                    </div>
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


                    {/* Email Section */}
                    <div className="bg-green-50 rounded-lg p-4 mb-6">
                      <h4 className="font-semibold text-green-900 mb-3">📧 Email This Plan</h4>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="email"
                          placeholder="Enter your email address"
                          value={emailAddress}
                          onChange={(e) => setEmailAddress(e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                        />
                        <button
                          onClick={sendOptimizedCalendarEmail}
                          disabled={isEmailSending || !emailAddress}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
                        >
                          {isEmailSending ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>Send Email</span>
                            </>
                          )}
                        </button>
                      </div>
                      
                      {/* Email Status */}
                      {emailStatus && (
                        <div className={`mt-3 p-3 rounded-lg ${
                          emailStatus.type === 'success' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <div className="flex items-center space-x-2">
                            {emailStatus.type === 'success' ? (
                              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                            )}
                            <span className="font-medium">{emailStatus.message}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={() => {
                          setGeneratedCalendar(null)
                          setGenerateStatus(null)
                        }}
                        className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                      >
                        Regenerate
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
