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
  
  // Consider zip code proximity for popular teams (simplified logic)
  const zipCode = userPreferences.zipCode
  if (zipCode) {
    // California zip codes (90000-96000) - boost LAL, LAC, GSW, SAC
    if (zipCode.startsWith('9')) {
      if (['LAL', 'LAC', 'GSW', 'SAC'].includes(game.homeTeam.teamTricode) || 
          ['LAL', 'LAC', 'GSW', 'SAC'].includes(game.awayTeam.teamTricode)) {
        priority += 2 // Regional preference
      }
    }
    // Add more regional logic as needed
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

SCHEDULING RULES PER DATE:
1. CREATE DAILY TV SCHEDULES - Each TV gets games for each day independently
2. NBA GAME DURATION - Each game lasts 3.5 hours (including pre/post-game coverage)
3. SAME-DAY CONFLICTS ONLY - Only worry about time conflicts within the same date
4. SIMULTANEOUS GAME SPLITTING - If 2 games start at same time ON THE SAME DATE, split TVs between them (have one TV show one game and another TV show the other game with preference on the more prominent game on the more prominenet TV)
5. If there are two games and four tvs, you should have two TVs show one game and two TVs show the other game.
5. PREFERENCE-BASED SPLITTING - Use user's favorite teams to determine TV splits (60/40, 70/30, etc.) If there are two games back to back and there are five tvs, and one game is a favorite team game and the other game is not a favorite team game, you should have three TVs show the favorite team game and two TVs show the other game.
6. DAILY COVERAGE - Plan complete schedules for each date independently

EXAMPLE SCHEDULING LOGIC (RESPECTING DATES):
MONDAY 1/15/2025:
- 4:00 PM: 2 games start simultaneously on Monday
  * Game A (user's favorite team): TVs 1,2,3,4,5,6 (60% of TVs)  
  * Game B (regular game): TVs 7,8,9,10 (40% of TVs)
- 7:30 PM: Both 4 pm games end, next game that day isat 8:00 PM
  * All TVs switch to the 8:00 PM Monday game

TUESDAY 1/16/2025:
- 7:00 PM: Tuesday game starts (NO CONFLICT with Monday games since it's a different day)
  * All TVs can show that Tuesday game - it's a different day! If there are no other games, all TV show should that same game.

CRITICAL REQUIREMENTS:
- RESPECT DATES: Games on different dates do NOT conflict
- SAME-DATE CONFLICTS: Only games on the same date and overlapping times conflict
- EVERY TV must have assignments when games are available
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

CRITICAL: Respond with ONLY valid JSON. No extra text before or after.

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

JSON FORMATTING REQUIREMENTS:
- All strings must be properly quoted with double quotes
- No trailing commas in arrays or objects
- Escape any quotes within string values with backslash
- Ensure all objects and arrays are properly closed

- MANDATORY TV TRANSITIONS: Every TV must show ALL games on each date in chronological order
- NO IDLE TVS: Never leave a TV empty when games are available on that date
- SEQUENTIAL SCHEDULING: TV1 shows Game1 (5:00-8:30), then transitions to Game2 (8:30-12:00)
- PRIORITY-BASED PROMINENCE: Higher priority games (favorite teams, regional preferences) get better TV placement
- MANDATORY DATE AWARENESS: Each assignment MUST include the correct date from the game data
- DAILY INDEPENDENCE: Games on different dates can use the same TV without conflict
- DISTRIBUTE ACROSS ALL TVs: Use TV numbers 1-${userPreferences.numberOfTvs} for each date that has games
- DATE FORMAT: Use YYYY-MM-DD format for dates (e.g., "2025-01-15")
- 3.5-HOUR GAME DURATION: NBA games last ~3.5 hours including pre/post-game
- FAVORITE TEAM PRIORITY: Games with user's favorite teams get premium TV assignments
- REGIONAL PREFERENCES: Teams near user's zip code get priority consideration
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a sports viewing optimizer that helps users manage multiple NBA games across multiple TVs. You MUST respond with ONLY valid JSON. No extra text before or after the JSON. Start with { and end with }."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 3000,
      response_format: { type: "json_object" }
    })

    const aiResponse = completion.choices[0]?.message?.content
    if (!aiResponse) {
      throw new Error('No response from OpenAI')
    }

    let aiData
    try {
      // Log the raw response for debugging
      console.log('Raw AI response length:', aiResponse.length)
      console.log('Raw AI response preview:', aiResponse.substring(0, 200) + '...')
      
      // With response_format: json_object, the response should be valid JSON
      aiData = JSON.parse(aiResponse)
      console.log('✅ Successfully parsed AI response')
      
      // Validate required fields
      if (!aiData.tvAssignments || !Array.isArray(aiData.tvAssignments)) {
        throw new Error('AI response missing valid tvAssignments array')
      }
      
      if (!aiData.recommendations || !Array.isArray(aiData.recommendations)) {
        console.warn('AI response missing recommendations, adding default')
        aiData.recommendations = ['AI-generated TV schedule based on your preferences']
      }
      
      if (!aiData.weekSummary || typeof aiData.weekSummary !== 'string') {
        console.warn('AI response missing weekSummary, adding default')
        aiData.weekSummary = `AI-optimized viewing plan for ${formatWeekRange(weekData.weekStart, weekData.weekEnd)}`
      }
      
      console.log(`AI provided ${aiData.tvAssignments.length} TV assignments`)
      
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error)
      console.error('Raw response that failed:', aiResponse)
      
      // This should not happen with response_format: json_object, but just in case
      throw new Error(`AI response parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}. This indicates an issue with the AI service.`)
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
        
        // For each date, handle time conflicts properly
        // Group games by time slot to identify conflicts
        const gamesByTimeSlot = new Map<string, typeof gamesOnDate>()
        gamesByTimeOnDate.forEach(game => {
          const timeKey = game.gameStatusText
          if (!gamesByTimeSlot.has(timeKey)) {
            gamesByTimeSlot.set(timeKey, [])
          }
          gamesByTimeSlot.get(timeKey)!.push(game)
        })
        
        console.log(`Date ${date} has ${gamesByTimeSlot.size} time slots:`, Array.from(gamesByTimeSlot.keys()))
        
        // Track which TVs are busy at each time
        const tvScheduleByTime = new Map<string, Set<number>>() // timeSlot -> set of busy TV numbers
        
        // Process each time slot
        Array.from(gamesByTimeSlot.entries())
          .sort(([timeA], [timeB]) => timeA.localeCompare(timeB)) // Sort by time
          .forEach(([timeSlot, gamesAtTime]) => {
            console.log(`Processing time slot ${timeSlot} with ${gamesAtTime.length} games`)
            
            if (!tvScheduleByTime.has(timeSlot)) {
              tvScheduleByTime.set(timeSlot, new Set())
            }
            
            if (gamesAtTime.length === 1) {
              // Single game - ALL TVs should show the same game (no conflicts)
              const game = gamesAtTime[0]
              const gameDate = game.gameDateEst.split(' ')[0]
              const timeSlotRange = `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`
              
              // Assign this game to ALL TVs since there's no conflict
              for (let tvNumber = 1; tvNumber <= userPreferences.numberOfTvs; tvNumber++) {
                assignments.push({
                  gameId: game.gameId,
                  tvNumber: tvNumber,
                  date: gameDate,
                  timeSlot: timeSlotRange,
                  reasoning: `All TVs show ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode} at ${timeSlot} on ${date} - no conflicts, all TVs available`
                })
                
                tvScheduleByTime.get(timeSlot)!.add(tvNumber)
                console.log(`TV ${tvNumber}: Shows ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode} (all TVs show same game)`)
              }
              
            } else {
              // Multiple games at same time - distribute across available TVs
              const sortedGames = [...gamesAtTime].sort((a, b) => b.priority - a.priority)
              
              sortedGames.forEach((game, gameIndex) => {
                // Find next available TV for this time slot
                let assignedTv = 1
                while (assignedTv <= userPreferences.numberOfTvs && tvScheduleByTime.get(timeSlot)!.has(assignedTv)) {
                  assignedTv++
                }
                
                // If we've run out of TVs, wrap around (this creates intentional duplicates for important games)
                if (assignedTv > userPreferences.numberOfTvs) {
                  assignedTv = (gameIndex % userPreferences.numberOfTvs) + 1
                }
                
                const gameDate = game.gameDateEst.split(' ')[0]
                const timeSlotRange = `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`
                
                let reasoning
                const isUserTeam = userPreferences.favoriteNbaTeams.includes(game.homeTeam.teamTricode) || 
                                  userPreferences.favoriteNbaTeams.includes(game.awayTeam.teamTricode)
                
                if (gameIndex === 0) {
                  reasoning = `Highest priority game at ${timeSlot} on ${date} - TV ${assignedTv}`
                  if (isUserTeam) reasoning += ' (FAVORITE TEAM)'
                } else {
                  reasoning = `Simultaneous game #${gameIndex + 1} at ${timeSlot} on ${date} - TV ${assignedTv}`
                  if (isUserTeam) reasoning += ' (FAVORITE TEAM)'
                }
                
                assignments.push({
                  gameId: game.gameId,
                  tvNumber: assignedTv,
                  date: gameDate,
                  timeSlot: timeSlotRange,
                  reasoning: reasoning
                })
                
                tvScheduleByTime.get(timeSlot)!.add(assignedTv)
                console.log(`TV ${assignedTv}: ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode} (Priority: ${game.priority})`)
              })
            }
          })
        
        // Handle sequential games and ensure all TVs are utilized
        console.log(`Ensuring all ${userPreferences.numberOfTvs} TVs are utilized for ${date}`)
        
        // Check which TVs are underutilized for this date
        const tvUtilization = new Map<number, number>()
        for (let tv = 1; tv <= userPreferences.numberOfTvs; tv++) {
          tvUtilization.set(tv, 0)
        }
        
        // Count games assigned to each TV for this date
        assignments.forEach(assignment => {
          if (assignment.date === date) {
            const currentCount = tvUtilization.get(assignment.tvNumber) || 0
            tvUtilization.set(assignment.tvNumber, currentCount + 1)
          }
        })
        
        // Find underutilized TVs
        const underutilizedTvs = []
        for (let tv = 1; tv <= userPreferences.numberOfTvs; tv++) {
          const utilization = tvUtilization.get(tv) || 0
          if (utilization === 0) {
            underutilizedTvs.push(tv)
          }
        }
        
        if (underutilizedTvs.length > 0) {
          console.log(`Found ${underutilizedTvs.length} underutilized TVs: ${underutilizedTvs.join(', ')}`)
          
          // Assign high-priority or favorite team games to underutilized TVs
          const dateGames = gamesByTimeOnDate.sort((a, b) => b.priority - a.priority)
          
          underutilizedTvs.forEach((tvNumber, index) => {
            if (index < dateGames.length) {
              const game = dateGames[index]
              const gameDate = game.gameDateEst.split(' ')[0]
              const timeSlotRange = `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`
              
              const isUserTeam = userPreferences.favoriteNbaTeams.includes(game.homeTeam.teamTricode) || 
                                userPreferences.favoriteNbaTeams.includes(game.awayTeam.teamTricode)
              
              // Check if this game is already assigned to avoid duplicates
              const existingAssignment = assignments.find(a => 
                a.gameId === game.gameId && a.date === gameDate
              )
              
              if (!existingAssignment) {
                assignments.push({
                  gameId: game.gameId,
                  tvNumber: tvNumber,
                  date: gameDate,
                  timeSlot: timeSlotRange,
                  reasoning: `Assigned to underutilized TV ${tvNumber} on ${date}${isUserTeam ? ' (FAVORITE TEAM)' : ''} - Priority: ${game.priority}`
                })
                
                console.log(`Utilization: TV ${tvNumber} gets ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode} (Priority: ${game.priority})`)
              } else {
                // Create a duplicate assignment for better coverage
                assignments.push({
                  gameId: game.gameId,
                  tvNumber: tvNumber,
                  date: gameDate,
                  timeSlot: timeSlotRange,
                  reasoning: `Duplicate coverage on TV ${tvNumber} for high-priority game on ${date}${isUserTeam ? ' (FAVORITE TEAM)' : ''} - Priority: ${game.priority}`
                })
                
                console.log(`Duplicate: TV ${tvNumber} also shows ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode} (Priority: ${game.priority})`)
              }
            }
          })
        }
      })
      
      console.log(`Generated ${assignments.length} conflict-free assignments across ${sortedDates.length} dates`)
      
      // FINAL UTILIZATION CHECK: Ensure all TVs have at least some assignments
      const globalTvUtilization = new Map<number, number>()
      for (let tv = 1; tv <= userPreferences.numberOfTvs; tv++) {
        globalTvUtilization.set(tv, 0)
      }
      
      assignments.forEach(assignment => {
        const currentCount = globalTvUtilization.get(assignment.tvNumber) || 0
        globalTvUtilization.set(assignment.tvNumber, currentCount + 1)
      })
      
      const emptyTvs = []
      for (let tv = 1; tv <= userPreferences.numberOfTvs; tv++) {
        const count = globalTvUtilization.get(tv) || 0
        if (count === 0) {
          emptyTvs.push(tv)
        }
      }
      
      if (emptyTvs.length > 0) {
        console.log(`FINAL CHECK: ${emptyTvs.length} TVs still need assignments: ${emptyTvs.join(', ')}`)
        
        // Assign the highest priority games to empty TVs as duplicates
        const allGames = gamesWithPriority.sort((a, b) => b.priority - a.priority)
        
        emptyTvs.forEach((tvNumber, index) => {
          if (index < allGames.length) {
            const game = allGames[index]
            const gameDate = game.gameDateEst.split(' ')[0]
            const timeSlotRange = `${game.gameStatusText} - ${getEndTime(game.gameStatusText)}`
            
            const isUserTeam = userPreferences.favoriteNbaTeams.includes(game.homeTeam.teamTricode) || 
                              userPreferences.favoriteNbaTeams.includes(game.awayTeam.teamTricode)
            
            assignments.push({
              gameId: game.gameId,
              tvNumber: tvNumber,
              date: gameDate,
              timeSlot: timeSlotRange,
              reasoning: `Final assignment to ensure TV ${tvNumber} is utilized - showing highest priority game${isUserTeam ? ' (FAVORITE TEAM)' : ''} - Priority: ${game.priority}`
            })
            
            console.log(`FINAL: TV ${tvNumber} gets highest priority game ${game.awayTeam.teamTricode} @ ${game.homeTeam.teamTricode} (Priority: ${game.priority})`)
          }
        })
        
        console.log(`Added ${emptyTvs.length} final assignments to ensure all TVs are utilized`)
      }
      
      // VALIDATION: Check for time conflicts
      const conflicts = []
      for (let i = 0; i < assignments.length; i++) {
        for (let j = i + 1; j < assignments.length; j++) {
          const a = assignments[i]
          const b = assignments[j]
          
          // Check if same TV, same date, and overlapping times
          if (a.tvNumber === b.tvNumber && a.date === b.date && a.timeSlot === b.timeSlot) {
            conflicts.push(`CONFLICT: TV ${a.tvNumber} has ${a.gameId} and ${b.gameId} both at ${a.timeSlot} on ${a.date}`)
          }
        }
      }
      
      if (conflicts.length > 0) {
        console.error('TV SCHEDULING CONFLICTS DETECTED:')
        conflicts.forEach(conflict => console.error(conflict))
      } else {
        console.log('✅ No TV scheduling conflicts detected!')
      }
      
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
    const emptyTvs = Object.entries(tvSchedule).filter(([, games]) => games.length === 0).map(([tv]) => tv)
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
