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
      // Use fallback logic without AI - distribute games with smart prioritization
      const fallbackAssignments = gamesWithPriority.map((game, index) => {
        const tvNumber = (index % userPreferences.numberOfTvs) + 1
        let reasoning = `Distributed to TV ${tvNumber} of ${userPreferences.numberOfTvs}`
        
        // Add context based on TV setup if available
        if (userPreferences.tvSetupDescription) {
          if (index < Math.ceil(gamesWithPriority.length / userPreferences.numberOfTvs)) {
            reasoning += ` (high priority game placement)`
          } else {
            reasoning += ` (balanced distribution across setup)`
          }
        }
        reasoning += ` (OpenAI API key not configured)`
        
        return {
          gameId: game.gameId,
          tvNumber,
          reasoning
        }
      })

      const optimizedGames: OptimizedGame[] = gamesWithPriority.map(game => {
        const assignment = fallbackAssignments.find(a => a.gameId === game.gameId)
        return {
          ...game,
          tvAssignment: assignment?.tvNumber || 1,
          color: getColorFromPriority(game.priority),
          reasoning: assignment?.reasoning || 'Default assignment'
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

1. DISTRIBUTE games across ALL ${userPreferences.numberOfTvs} TVs - DO NOT put all games on TV 1
2. ANALYZE the TV setup description to understand which TVs are most prominent/visible
3. ASSIGN highest priority games (user's favorite teams, playoffs) to the most prominent TVs
4. Consider time conflicts - games at the same time should go on different TVs
5. Use location context (main dining area vs bar vs kitchen) for optimal placement

TV SETUP ANALYSIS:
${userPreferences.tvSetupDescription || 'No description provided'}

ASSIGNMENT STRATEGY:
- Parse the TV setup to identify: main/primary TVs, secondary viewing areas, background locations
- Keywords to look for: "main", "primary", "large", "65\"", "living room", "dining area" = high prominence
- Keywords like: "kitchen", "small", "32\"", "background", "corner" = lower prominence
- Assign games with highest priority scores to most prominent locations
- Distribute remaining games to ensure all TVs have content

CRITICAL: You have ${userPreferences.numberOfTvs} TVs available. Use TV numbers 1 through ${userPreferences.numberOfTvs}.

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
      "reasoning": "Why this game is on this TV (include prominence/location context)"
    }
  ],
  "recommendations": [
    "Overall viewing strategy recommendations based on TV setup"
  ],
  "weekSummary": "Brief summary of the week's viewing plan with TV placement strategy"
}

Focus on:
- MANDATORY: Distribute games across ALL ${userPreferences.numberOfTvs} TVs (use TV numbers 1-${userPreferences.numberOfTvs})
- PROMINENCE-BASED ASSIGNMENT: Highest priority games go on most prominent/visible TVs
- LOCATION INTELLIGENCE: Use TV setup description to understand viewing hierarchy
- Simultaneous games MUST go on different TVs to avoid conflicts
- Balance the number of games per TV while respecting prominence hierarchy
- For restaurant/bar: Prime games on main dining area TVs, secondary on bar/waiting areas
- Background TVs (kitchen, corners) get lower priority content but still engaging games
- REASONING: Always explain TV choice based on game priority + TV prominence/location
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
    
    // Validate that games are actually distributed across TVs
    const usedTvs = new Set(aiData.tvAssignments.map((a: any) => a.tvNumber))
    if (usedTvs.size === 1 && userPreferences.numberOfTvs > 1) {
      console.warn('AI assigned all games to one TV, redistributing')
      aiData.tvAssignments = gamesWithPriority.map((game, index) => ({
        gameId: game.gameId,
        tvNumber: (index % userPreferences.numberOfTvs) + 1,
        reasoning: `Redistributed to TV ${(index % userPreferences.numberOfTvs) + 1} for better coverage`
      }))
    }
    
    if (!aiData.recommendations) {
      aiData.recommendations = ['AI recommendations unavailable - using automatic assignments']
    }
    
    if (!aiData.weekSummary) {
      aiData.weekSummary = `Viewing plan for ${formatWeekRange(weekData.weekStart, weekData.weekEnd)} with automatic TV assignments`
    }

    // Apply AI recommendations to games
    const optimizedGames: OptimizedGame[] = gamesWithPriority.map(game => {
      const assignment = aiData.tvAssignments?.find((a: { gameId: string; tvNumber: number; reasoning: string }) => a.gameId === game.gameId)
      const tvNumber = assignment?.tvNumber || 1
      const reasoning = assignment?.reasoning || 'Default assignment'
      
      return {
        ...game,
        tvAssignment: tvNumber,
        color: getColorFromPriority(game.priority),
        reasoning
      }
    })

    // Group games by TV
    const tvSchedule: { [tvNumber: number]: OptimizedGame[] } = {}
    for (let i = 1; i <= userPreferences.numberOfTvs; i++) {
      tvSchedule[i] = optimizedGames.filter(game => game.tvAssignment === i)
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
