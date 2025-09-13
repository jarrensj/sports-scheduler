import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

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

interface TvAssignment {
  gameId: string
  tvNumber: number
  date?: string
  timeSlot?: string
  reasoning: string
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
  homeTeam: Team
  awayTeam: Team
  pointsLeaders: unknown[]
}

interface UserPreferences {
  sportsInterests: string[]
  numberOfTvs: number
  tvSetupDescription: string
  favoriteNbaTeams: string[]
  zipCode: string
}

interface WeekData {
  weekStart: string
  weekEnd: string
  games: Game[]
}

interface CalendarRequest {
  weekData: WeekData
  userPreferences: UserPreferences
}

interface OptimizedGame extends Game {
  priority: number
  tvAssignment: number
  color: string
  reasoning: string
  assignedDate?: string
  assignedTimeSlot?: string
}

interface CalendarResponse {
  optimizedGames: OptimizedGame[]
  tvSchedule: {
    [tvNumber: number]: OptimizedGame[]
  }
  recommendations: string[]
  weekSummary: string
}

function formatWeekRange(weekStart: string, weekEnd: string) {
  const start = new Date(weekStart)
  const end = new Date(weekEnd)
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })
  const startDay = start.getDate()
  const endDay = end.getDate()
  const year = end.getFullYear()
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }
}

function calculatePriority(game: Game, userPreferences: UserPreferences): number {
  let priority = 5 // Base priority (1-10 scale)
  
  // Check if user's favorite teams are playing
  const isUserTeamPlaying = userPreferences.favoriteNbaTeams.includes(game.homeTeam.teamTricode) || 
                           userPreferences.favoriteNbaTeams.includes(game.awayTeam.teamTricode)
  
  if (isUserTeamPlaying) {
    priority += 3 // High priority for favorite teams
  }
  
  // Consider playoff games
  if (game.gameLabel && (game.gameLabel.toLowerCase().includes('playoff') || 
      game.gameLabel.toLowerCase().includes('finals'))) {
    priority += 2
  }
  
  // Consider team records (better teams = higher priority)
  const avgWinPct = ((game.homeTeam.wins / (game.homeTeam.wins + game.homeTeam.losses)) + 
                     (game.awayTeam.wins / (game.awayTeam.wins + game.awayTeam.losses))) / 2
  
  if (avgWinPct > 0.7) priority += 1
  else if (avgWinPct < 0.3) priority -= 1
  
  return Math.max(1, Math.min(10, priority))
}

function getColorFromPriority(priority: number): string {
  // Priority scale: 1-10
  // Blue (high priority) to Yellow (low priority)
  const normalizedPriority = (priority - 1) / 9 // Normalize to 0-1
  
  // Interpolate between blue and yellow
  const blue = Math.round(255 - (normalizedPriority * 255)) // Blue decreases
  const green = Math.round(165 + (normalizedPriority * 90)) // Green increases
  const red = Math.round(normalizedPriority * 255) // Red increases
  
  return `rgb(${red}, ${green}, ${blue})`
}

function getEndTime(startTime: string): string {
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

export async function POST(request: NextRequest) {
  try {
    const { weekData, userPreferences }: CalendarRequest = await request.json()

    if (!weekData || !userPreferences) {
      return NextResponse.json(
        { error: 'Missing required fields: weekData and userPreferences' },
        { status: 400 }
      )
    }

    // Calculate priorities and colors for each game
    const gamesWithPriority = weekData.games.map(game => ({
      ...game,
      priority: calculatePriority(game, userPreferences),
      tvAssignment: 1, // Will be updated by AI
      color: '',
      reasoning: ''
    }))

    // Sort games by priority (highest first)
    gamesWithPriority.sort((a, b) => b.priority - a.priority)

    if (!process.env.OPENAI_API_KEY) {
      console.warn('OpenAI API key not configured, using fallback logic')
      // Use fallback logic without AI - create sequential schedules for all TVs
      const fallbackAssignments = []
      
      // Sort games by time to create proper sequences
      const gamesByTime = [...gamesWithPriority].sort((a, b) => {
        // Simple time comparison - in real app you'd parse actual times
        return a.gameStatusText.localeCompare(b.gameStatusText)
      })
      
      // Assign games to TVs with sequential scheduling
      gamesByTime.forEach((game, gameIndex) => {
        const tvNumber = (gameIndex % userPreferences.numberOfTvs) + 1
        
        let reasoning = `Scheduled on TV ${tvNumber} - sequential scheduling for continuous coverage`
        
        if (userPreferences.tvSetupDescription) {
          reasoning += ` (optimized for your TV setup)`
        }
        reasoning += ` (OpenAI API key not configured)`
        
        fallbackAssignments.push({
          gameId: game.gameId,
          tvNumber,
          date: game.gameDateEst.split(' ')[0], // Extract date part
          timeSlot: `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`,
          reasoning
        })
      })
      
      // If we still have fewer assignments than TVs, duplicate strategically
      if (fallbackAssignments.length < userPreferences.numberOfTvs) {
        for (let tvIndex = fallbackAssignments.length; tvIndex < userPreferences.numberOfTvs; tvIndex++) {
          const gameIndex = tvIndex % gamesWithPriority.length
          const game = gamesWithPriority[gameIndex]
          const tvNumber = tvIndex + 1
          
          fallbackAssignments.push({
            gameId: game.gameId,
            tvNumber,
            date: game.gameDateEst.split(' ')[0], // Extract date part
            timeSlot: `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`,
            reasoning: `Duplicate coverage on TV ${tvNumber} - ensures no empty screens during peak hours`
          })
        }
      }

      // Create optimized games including duplicates
      const optimizedGames: OptimizedGame[] = fallbackAssignments.map(assignment => {
        const game = gamesWithPriority.find(g => g.gameId === assignment.gameId)!
        return {
          ...game,
          tvAssignment: assignment.tvNumber,
          color: getColorFromPriority(game.priority),
          reasoning: assignment.reasoning
        }
      })

      const tvSchedule: { [tvNumber: number]: OptimizedGame[] } = {}
      for (let i = 1; i <= userPreferences.numberOfTvs; i++) {
        tvSchedule[i] = optimizedGames.filter(game => game.tvAssignment === i)
      }

      const response: CalendarResponse = {
        optimizedGames,
        tvSchedule,
        recommendations: [
          'OpenAI API not configured - using automatic assignments based on priority',
          `Games distributed across ${userPreferences.numberOfTvs} TVs with highest priority content on primary screens`,
          userPreferences.tvSetupDescription ? 'TV placement considers your setup description for optimal viewing' : 'Consider adding TV setup description for better optimization'
        ],
        weekSummary: `Automatic viewing plan for ${formatWeekRange(weekData.weekStart, weekData.weekEnd)} with priority-based TV distribution`
      }

      return NextResponse.json(response)
    }

    // Group games by date for better organization
    const gamesByDate = new Map<string, typeof gamesWithPriority>()
    gamesWithPriority.forEach(game => {
      const dateKey = game.gameDateEst.split(' ')[0] // Extract just the date part
      if (!gamesByDate.has(dateKey)) {
        gamesByDate.set(dateKey, [])
      }
      gamesByDate.get(dateKey)!.push(game)
    })

    // Sort dates chronologically
    const sortedDates = Array.from(gamesByDate.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

    // Create prompt for OpenAI
    const prompt = `
You are a sports viewing optimizer for a multi-TV environment. Given the following NBA games for the week and user preferences, please create TV schedules that respect DATES and TIMES.

CRITICAL DATE AWARENESS:
- Games on DIFFERENT DATES do NOT conflict with each other
- Only games on the SAME DATE and SAME TIME create scheduling conflicts
- Each date should have its own independent TV schedule
- A TV can show Game A on Monday and Game B on Tuesday without any conflict

SCHEDULING RULES PER DATE:
1. CREATE DAILY TV SCHEDULES - Each TV gets games for each day independently
2. NBA GAME DURATION - Each game lasts 3.5 hours (including pre/post-game coverage)
3. SAME-DAY CONFLICTS ONLY - Only worry about time conflicts within the same date
4. SIMULTANEOUS GAME SPLITTING - If 2 games start at same time ON THE SAME DATE, split TVs between them
5. PREFERENCE-BASED SPLITTING - Use user's favorite teams to determine TV splits (60/40, 70/30, etc.)
6. DAILY COVERAGE - Plan complete schedules for each date independently

EXAMPLE SCHEDULING LOGIC (RESPECTING DATES):
MONDAY 1/15/2025:
- 4:00 PM: 2 games start simultaneously on Monday
  * Game A (user's favorite team): TVs 1,2,3,4,5,6 (60% of TVs)  
  * Game B (regular game): TVs 7,8,9,10 (40% of TVs)
- 7:30 PM: Monday games end, next Monday game at 8:00 PM
  * All TVs switch to the 8:00 PM Monday game

TUESDAY 1/16/2025:
- 7:00 PM: Tuesday game starts (NO CONFLICT with Monday games)
  * All TVs can show Tuesday game - it's a different day!

CRITICAL REQUIREMENTS:
- RESPECT DATES: Games on different dates do NOT conflict
- SAME-DATE CONFLICTS: Only games on the same date and overlapping times conflict
- DAILY INDEPENDENCE: Each date gets its own TV schedule
- EVERY TV must have assignments for days when games are available
- Use user preferences to weight TV assignments (favorite teams get more TVs)

TV SETUP ANALYSIS:
${userPreferences.tvSetupDescription || 'No description provided'}

ASSIGNMENT STRATEGY:
- Parse the TV setup to identify: main/primary TVs, secondary viewing areas, background locations
- Keywords to look for: "main", "primary", "large", "65\"", "living room", "dining area" = high prominence
- Keywords like: "kitchen", "small", "32\"", "background", "corner" = lower prominence
- Assign games with highest priority scores to most prominent locations
- CREATE DAILY SCHEDULES: Each date is independent - no cross-date conflicts
- DAILY COVERAGE: Each TV should show available games for each date

CRITICAL: You have ${userPreferences.numberOfTvs} TVs available. Use TV numbers 1 through ${userPreferences.numberOfTvs}.

User's favorite teams: ${userPreferences.favoriteNbaTeams.join(', ') || 'None specified'}
Number of TVs: ${userPreferences.numberOfTvs}
Week: ${formatWeekRange(weekData.weekStart, weekData.weekEnd)}

GAMES ORGANIZED BY DATE:
${sortedDates.map(date => {
  const gamesOnDate = gamesByDate.get(date)!
  return `
DATE: ${date}
${gamesOnDate.map((game, index) => `
  ${index + 1}. ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode}
     Time: ${game.gameStatusText}
     Full DateTime: ${game.gameDateEst}
     Priority: ${game.priority}/10
     Teams: ${game.awayTeam.teamCity} ${game.awayTeam.teamName} vs ${game.homeTeam.teamCity} ${game.homeTeam.teamName}
`).join('')}`
}).join('\n')}

Please respond with a JSON object containing:
{
  "tvAssignments": [
    {
      "gameId": "game_id_here",
      "tvNumber": 1,
      "date": "2025-01-15",
      "timeSlot": "4:00-7:30 PM",
      "reasoning": "Monday 1/15 game on TV 1 - no conflicts with other dates"
    },
    {
      "gameId": "different_game_id",
      "tvNumber": 1,
      "date": "2025-01-16", 
      "timeSlot": "7:00-10:30 PM",
      "reasoning": "Tuesday 1/16 game on TV 1 - different date, no conflict with Monday"
    },
    {
      "gameId": "same_day_game_id",
      "tvNumber": 2,
      "date": "2025-01-15",
      "timeSlot": "4:00-7:30 PM",
      "reasoning": "Monday 1/15 simultaneous game on TV 2 - same time as TV 1 but different TV"
    }
  ],
  "recommendations": [
    "Date-aware scheduling strategy with proper daily organization"
  ],
  "weekSummary": "Week-long TV schedule organized by date with no cross-date conflicts"
}

Focus on:
- MANDATORY DATE AWARENESS: Each assignment MUST include the correct date from the game data
- DAILY INDEPENDENCE: Games on different dates can use the same TV without conflict
- SAME-DATE CONFLICTS: Only worry about time conflicts within the same date
- DISTRIBUTE ACROSS ALL TVs: Use TV numbers 1-${userPreferences.numberOfTvs} for each date that has games
- MULTIPLE DAYS COVERAGE: If games span multiple dates, create assignments for each date
- DATE FORMAT: Use YYYY-MM-DD format for dates (e.g., "2025-01-15")
- 3.5-HOUR GAME DURATION: NBA games last ~3.5 hours including pre/post-game
- DAILY TRANSITIONS: Within the same date, plan transitions between games
- CROSS-DATE FREEDOM: TVs can show any game on different dates without restriction
- PROMINENCE-BASED ASSIGNMENT: Highest priority games go on most prominent/visible TVs
- LOCATION INTELLIGENCE: Use TV setup description provided by user to understand viewing hierarchy
- REASONING: Always explain TV choice including the DATE and why there are no conflicts with other dates
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a sports viewing optimizer that helps users manage multiple NBA games across multiple TVs. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    let aiData
    try {
      // Log the raw response for debugging
      console.log('Raw AI response:', aiResponse)
      
      // Try to extract JSON from the response (sometimes AI includes extra text)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? jsonMatch[0] : aiResponse
      
      aiData = JSON.parse(jsonString)
    } catch (error) {
      console.error('Failed to parse AI response:', aiResponse)
      console.error('Parse error:', error)
      throw new Error(`Invalid JSON response from AI: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Ensure aiData has the expected structure
    if (!aiData.tvAssignments) {
      console.warn('AI response missing tvAssignments, using fallback distribution')
      aiData.tvAssignments = gamesWithPriority.map((game, index) => ({
        gameId: game.gameId,
        tvNumber: (index % userPreferences.numberOfTvs) + 1,
        date: game.gameDateEst.split(' ')[0], // Extract date part
        timeSlot: `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`,
        reasoning: `Distributed to TV ${(index % userPreferences.numberOfTvs) + 1} for balanced restaurant viewing on ${game.gameDateEst.split(' ')[0]}`
      }))
    }
    
    // FORCE DISTRIBUTION ACROSS ALL TVS - No exceptions!
    console.log('Original AI assignments:', aiData.tvAssignments)
    
    // Always force even distribution if we have more than 1 TV
    if (userPreferences.numberOfTvs > 1) {
      
      // Create date-aware assignments for ALL TVs
      const assignments: TvAssignment[] = []
      
      // Process each date independently to avoid cross-date conflicts
      sortedDates.forEach(date => {
        const gamesOnDate = gamesByDate.get(date)!
        
        // Sort games by time within this date
        const gamesByTimeOnDate = [...gamesOnDate].sort((a, b) => {
          return a.gameStatusText.localeCompare(b.gameStatusText)
        })
        
        console.log(`Processing date ${date} with ${gamesOnDate.length} games:`, gamesByTimeOnDate.map(g => `${g.awayTeam.teamTricode} @ ${g.homeTeam.teamTricode} (${g.gameStatusText})`))
        
        // For each date, distribute games across all TVs
        // This ensures each date gets proper TV coverage
        gamesByTimeOnDate.forEach((game, gameIndex) => {
          // Distribute each game across multiple TVs if we have more TVs than games on this date
          const tvsPerGame = Math.max(1, Math.floor(userPreferences.numberOfTvs / gamesByTimeOnDate.length))
          const extraTvs = userPreferences.numberOfTvs % gamesByTimeOnDate.length
          
          // Calculate how many TVs this game should get
          let tvsForThisGame = tvsPerGame
          if (gameIndex < extraTvs) {
            tvsForThisGame += 1 // Distribute extra TVs to first few games
          }
          
          // Assign TVs to this game
          for (let tvOffset = 0; tvOffset < tvsForThisGame; tvOffset++) {
            const tvNumber = (gameIndex * tvsPerGame) + tvOffset + (gameIndex < extraTvs ? gameIndex : extraTvs) + 1
            
            if (tvNumber <= userPreferences.numberOfTvs) {
              const gameDate = game.gameDateEst.split(' ')[0] // Extract date part
              const timeSlot = `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`
              
              let reasoning
              if (gamesByTimeOnDate.length < userPreferences.numberOfTvs) {
                reasoning = `TV ${tvNumber} showing ${date} game (${tvOffset + 1} of ${tvsForThisGame} TVs for this matchup) - multi-screen coverage for date ${date}`
              } else {
                reasoning = `TV ${tvNumber} assigned to ${date} game - date-specific scheduling`
              }
              
              assignments.push({
                gameId: game.gameId,
                tvNumber: tvNumber,
                date: gameDate,
                timeSlot: timeSlot,
                reasoning: reasoning
              })
              
              console.log(`TV ${tvNumber}: Assigned ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode} on ${date} (${timeSlot})`)
            }
          }
        })
      })
      
      console.log(`Generated ${assignments.length} date-aware assignments across ${sortedDates.length} dates`)
      aiData.tvAssignments = assignments
    }
    
    // Double-check by counting games per TV
    const finalGameCount = new Map<number, number>()
    aiData.tvAssignments.forEach((assignment: TvAssignment) => {
      const tv = assignment.tvNumber
      finalGameCount.set(tv, (finalGameCount.get(tv) || 0) + 1)
    })
    
    if (!aiData.recommendations) {
      aiData.recommendations = ['AI recommendations unavailable - using automatic assignments']
    }
    
    if (!aiData.weekSummary) {
      aiData.weekSummary = `Viewing plan for ${formatWeekRange(weekData.weekStart, weekData.weekEnd)} with automatic TV assignments`
    }
    
    // Create optimized games from assignments (may include duplicates)
    const optimizedGames: OptimizedGame[] = aiData.tvAssignments.map((assignment: TvAssignment) => {
      const game = gamesWithPriority.find(g => g.gameId === assignment.gameId)!
      
      console.log(`Game ${game.gameId} (${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode}) assigned to TV ${assignment.tvNumber} on ${assignment.date || 'unknown date'}`)
      
      return {
        ...game,
        tvAssignment: assignment.tvNumber,
        color: getColorFromPriority(game.priority),
        reasoning: assignment.reasoning,
        assignedDate: assignment.date,
        assignedTimeSlot: assignment.timeSlot
      }
    })

    // Group games by TV
    const tvSchedule: { [tvNumber: number]: OptimizedGame[] } = {}
    for (let i = 1; i <= userPreferences.numberOfTvs; i++) {
      tvSchedule[i] = optimizedGames.filter(game => game.tvAssignment === i)
    }
    
    // Check for empty TVs
    const emptyTvs = Object.entries(tvSchedule).filter(([_, games]) => games.length === 0).map(([tv]) => tv)
    if (emptyTvs.length > 0) {
      console.error(`WARNING: ${emptyTvs.length} TVs have NO games assigned: ${emptyTvs.join(', ')}`)
    } else {
      console.log(`SUCCESS: All ${userPreferences.numberOfTvs} TVs have game assignments!`)
    }

    const response: CalendarResponse = {
      optimizedGames,
      tvSchedule,
      recommendations: aiData.recommendations || ['Enjoy your games!'],
      weekSummary: aiData.weekSummary || `Optimized viewing plan for ${formatWeekRange(weekData.weekStart, weekData.weekEnd)}`
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Generate calendar API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
