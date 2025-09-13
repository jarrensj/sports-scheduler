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

    // Create prompt for OpenAI
    const prompt = `
You are a sports viewing optimizer for a multi-TV environment. Given the following NBA games for the week and user preferences, please:

1. CREATE TIME-BASED TV SCHEDULES - Each TV gets a sequence of games throughout the day
2. NBA GAME DURATION - Each game lasts 3.5 hours (including pre/post-game coverage)
3. SEQUENTIAL TRANSITIONS - When a game ends, that TV immediately switches to the next available game
4. SIMULTANEOUS GAME SPLITTING - If 2 games start at same time, split TVs between them (e.g., 5 TVs on Game A, 5 TVs on Game B)
5. PREFERENCE-BASED SPLITTING - Use user's favorite teams to determine TV splits (60/40, 70/30, etc.)
6. CONTINUOUS COVERAGE - Plan complete daily schedules so no TV is ever empty when games are available

EXAMPLE SCHEDULING LOGIC:
- 4:00 PM: 2 games start simultaneously
  * Game A (user's favorite team): TVs 1,2,3,4,5,6 (60% of TVs)  
  * Game B (regular game): TVs 7,8,9,10 (40% of TVs)
- 7:30 PM: Games A & B end, next game starts at 8:00 PM
  * All TVs (1-10) switch to the 8:00 PM game
- 11:30 PM: 8:00 PM game ends, next game starts at 12:00 AM
  * All TVs (1-10) switch to the 12:00 AM game

CRITICAL REQUIREMENTS:
- EVERY TV must have a complete schedule for the day
- When games end (after 3.5 hours), TVs transition to next available game
- Split TVs intelligently when multiple games start simultaneously
- Use user preferences to weight TV assignments (favorite teams get more TVs)
- NO TV should ever be empty if games are available

TV SETUP ANALYSIS:
${userPreferences.tvSetupDescription || 'No description provided'}

ASSIGNMENT STRATEGY:
- Parse the TV setup to identify: main/primary TVs, secondary viewing areas, background locations
- Keywords to look for: "main", "primary", "large", "65\"", "living room", "dining area" = high prominence
- Keywords like: "kitchen", "small", "32\"", "background", "corner" = lower prominence
- Assign games with highest priority scores to most prominent locations
- CREATE SEQUENTIAL SCHEDULES: When Game A ends at 7:30 PM, assign Game B starting at 8:00 PM to same TV
- CONTINUOUS COVERAGE: Each TV should show games from early afternoon through late night
- HANDOFF PLANNING: Coordinate game transitions so TVs never go dark between games

CRITICAL: You have ${userPreferences.numberOfTvs} TVs available. Use TV numbers 1 through ${userPreferences.numberOfTvs}.

EXAMPLE DISTRIBUTION (for ${userPreferences.numberOfTvs} TVs):
${Array.from({length: Math.min(userPreferences.numberOfTvs, 5)}, (_, i) => `- TV ${i + 1}: Should get games assigned`).join('\n')}
${userPreferences.numberOfTvs > 5 ? `... and so on for all ${userPreferences.numberOfTvs} TVs` : ''}

MULTIPLE TVS PER GAME STRATEGY:
If there are fewer games than TVs (e.g., 2 games but 10 TVs):
- Game 1 should appear on multiple TVs (e.g., TVs 1, 3, 5, 7, 9)  
- Game 2 should appear on remaining TVs (e.g., TVs 2, 4, 6, 8, 10)
- This ensures ALL TVs have content and customers can choose their preferred viewing angle

User's favorite teams: ${userPreferences.favoriteNbaTeams.join(', ') || 'None specified'}
Number of TVs: ${userPreferences.numberOfTvs}
Week: ${formatWeekRange(weekData.weekStart, weekData.weekEnd)}

Games (sorted by calculated priority):
${gamesWithPriority.map((game, index) => `
${index + 1}. ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode}
   Time: ${game.gameStatusText}
   Date: ${game.gameDateEst}
   Priority: ${game.priority}/10
   Teams: ${game.awayTeam.teamCity} ${game.awayTeam.teamName} vs ${game.homeTeam.teamCity} ${game.homeTeam.teamName}
`).join('')}

Please respond with a JSON object containing:
{
  "tvAssignments": [
    {
      "gameId": "game_id_here",
      "tvNumber": 1,
      "date": "01/15/2025",
      "timeSlot": "4:00-7:30 PM",
      "reasoning": "Why this game is on this TV at this time (include transitions)"
    },
    {
      "gameId": "next_game_id",
      "tvNumber": 1,
      "date": "01/15/2025",
      "timeSlot": "8:00-11:30 PM", 
      "reasoning": "Sequential assignment after previous game ends"
    }
  ],
  "recommendations": [
    "Daily scheduling strategy with game transitions explained"
  ],
  "weekSummary": "Brief summary of daily TV schedules with transition timing"
}

Focus on:
- MANDATORY: Distribute games across ALL ${userPreferences.numberOfTvs} TVs (use TV numbers 1-${userPreferences.numberOfTvs}) - EVERY TV MUST HAVE CONTENT
- MULTIPLE TVS PER GAME: When fewer games than TVs (2 games, 10 TVs), assign multiple TVs to each game for complete coverage
- SEQUENTIAL SCHEDULING: Each TV should show multiple games throughout the day if there are multiple games available (Game 1: 1:00-4:30 PM, Game 2: 5:00-8:30 PM, Game 3: 9:00-12:30 AM, etc.)
- 3.5-HOUR GAME DURATION: NBA games last ~3.5 hours including pre/post-game, plan TV transitions accordingly
- You can start switching the TV to tune into the game as early as 1 hour before the game starts if it is not busy and there are no other games on or if it's a game where the user's preferred team is playing. But if there is a game currently playing and a TV is currently not playing anything, it should tune into that available game even if it's low priority.
- The TV should always tune into a game if there is a game available or even tune into a game early if there are no games available. 
- AUTOMATIC TRANSITIONS: When one game ends (~3.5 hrs later), immediately assign the next available game to that TV
- PROMINENCE-BASED ASSIGNMENT: Highest priority games go on most prominent/visible TVs
- LOCATION INTELLIGENCE: Use TV setup description provided by user to understand viewing hierarchy
- TIME CONFLICT RESOLUTION: Games at the same time should go on different TVs with higher priority games going on more prominent TVs.
- Balance the number of games per TV while respecting prominence hierarchy
- For restaurant/bar: Prime games on main dining area TVs, secondary on bar/waiting areas
- Background TVs (kitchen, corners) get lower priority content but still engaging games
- REASONING: Always explain TV choice based on game priority + TV prominence/location + time scheduling
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
        reasoning: `Distributed to TV ${(index % userPreferences.numberOfTvs) + 1} for balanced restaurant viewing`
      }))
    }
    
    // FORCE DISTRIBUTION ACROSS ALL TVS - No exceptions!
    console.log('Original AI assignments:', aiData.tvAssignments)
    
    // Always force even distribution if we have more than 1 TV
    if (userPreferences.numberOfTvs > 1) {
      
      // Create time-based assignments for ALL TVs
      const assignments = []
      
      // Sort games by time for proper sequencing
      const gamesByTime = [...gamesWithPriority].sort((a, b) => {
        return a.gameStatusText.localeCompare(b.gameStatusText)
      })
      
      console.log(`Games sorted by time:`, gamesByTime.map(g => `${g.awayTeam.teamTricode} @ ${g.homeTeam.teamTricode} (${g.gameStatusText})`))
      
      // RESTAURANT LOGIC: Focus on main games of the day, not all week games
      // For restaurant: Limit to top games and distribute those across multiple TVs
      const mainGames = gamesByTime.slice(0, Math.min(4, gamesByTime.length)) // Max 4 main games per day
      console.log(`Main games for restaurant distribution:`, mainGames.map(g => `${g.awayTeam.teamTricode} @ ${g.homeTeam.teamTricode} (${g.gameStatusText})`))
      
      // Assign games to ALL TVs - distribute main games across multiple TVs
      for (let tvIndex = 0; tvIndex < userPreferences.numberOfTvs; tvIndex++) {
        const tvNumber = tvIndex + 1
        const gameIndex = tvIndex % mainGames.length
        const game = mainGames[gameIndex]
        
        // Calculate how many TVs will show this game
        const tvsPerGame = Math.ceil(userPreferences.numberOfTvs / mainGames.length)
        const gameAssignmentNumber = Math.floor(tvIndex / mainGames.length) + 1
        
        console.log(`TV ${tvNumber}: Assigning main game index ${gameIndex} (${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode}) - ${gameAssignmentNumber} of ${tvsPerGame} TVs for this game`)
        
        let reasoning
        if (mainGames.length < userPreferences.numberOfTvs) {
          // Multiple TVs per game scenario (e.g., 2 games, 10 TVs)
          reasoning = `TV ${tvNumber} showing this game (${gameAssignmentNumber} of ${tvsPerGame} TVs for this matchup) - restaurant multi-screen strategy`
        } else {
          // Enough games for each TV
          reasoning = `Primary assignment for TV ${tvNumber} - sequential scheduling planned`
        }
        
        assignments.push({
          gameId: game.gameId,
          tvNumber: tvNumber,
          reasoning: reasoning
        })
      }      
      // Group assignments by game to show distribution
      const gameAssignmentMap = new Map()
      assignments.forEach(assignment => {
        const game = mainGames.find(g => g.gameId === assignment.gameId)
        if (game) {
          const gameKey = `${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode}`
          if (!gameAssignmentMap.has(gameKey)) {
            gameAssignmentMap.set(gameKey, [])
          }
          gameAssignmentMap.get(gameKey).push(assignment.tvNumber)
        }
      })
      
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
