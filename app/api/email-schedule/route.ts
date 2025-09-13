import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 'your-api-key-here')

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

interface WeekData {
  weekStart: string
  weekEnd: string
  games: Game[]
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

function formatGameTime(gameStatusText: string) {
  return gameStatusText
}

function formatDate(dateString: string) {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function generateEmailHTML(weekData: WeekData) {
  const weekRange = formatWeekRange(weekData.weekStart, weekData.weekEnd)
  
  // Group games by date
  const gamesByDate = new Map<string, Game[]>()
  weekData.games.forEach(game => {
    const date = game.gameDateEst.split(' ')[0] // Get date part only
    if (!gamesByDate.has(date)) {
      gamesByDate.set(date, [])
    }
    gamesByDate.get(date)!.push(game)
  })

  // Sort dates
  const sortedDates = Array.from(gamesByDate.keys()).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime()
  })

  let gamesHTML = ''
  
  if (sortedDates.length === 0) {
    gamesHTML = '<p style="text-align: center; color: #666; font-style: italic; margin: 20px 0;">No games scheduled for this week.</p>'
  } else {
    gamesHTML = sortedDates.map(date => {
      const games = gamesByDate.get(date)!
      const formattedDate = formatDate(date)
      
      const dayGamesHTML = games.map(game => `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 8px 0; background-color: #ffffff;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="background-color: #fed7aa; color: #ea580c; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-weight: 500;">
                ${game.gameLabel}
              </span>
              ${game.gameSubLabel ? `<span style="background-color: #f3f4f6; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 14px;">${game.gameSubLabel}</span>` : ''}
            </div>
            <div style="font-size: 18px; font-weight: 600; color: #2563eb;">
              ${formatGameTime(game.gameStatusText)}
            </div>
          </div>
          
          <div style="margin-bottom: 12px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 14px; color: #6b7280; width: 48px;">Away:</span>
                <span style="font-weight: 600; color: #111827;">
                  ${game.awayTeam.teamCity} ${game.awayTeam.teamName}
                </span>
                <span style="background-color: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-family: monospace;">
                  ${game.awayTeam.teamTricode}
                </span>
                <span style="font-size: 14px; color: #6b7280;">
                  (${game.awayTeam.wins}-${game.awayTeam.losses})
                </span>
              </div>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 14px; color: #6b7280; width: 48px;">Home:</span>
                <span style="font-weight: 600; color: #111827;">
                  ${game.homeTeam.teamCity} ${game.homeTeam.teamName}
                </span>
                <span style="background-color: #e5e7eb; color: #374151; padding: 4px 8px; border-radius: 4px; font-size: 14px; font-family: monospace;">
                  ${game.homeTeam.teamTricode}
                </span>
                <span style="font-size: 14px; color: #6b7280;">
                  (${game.homeTeam.wins}-${game.homeTeam.losses})
                </span>
              </div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
            <div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #6b7280;">
              <svg style="width: 16px; height: 16px;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>
                ${game.arenaName}${game.arenaCity ? `, ${game.arenaCity}` : ''}${game.arenaState ? `, ${game.arenaState}` : ''}
              </span>
              ${game.isNeutral ? '<span style="background-color: #fef3c7; color: #d97706; padding: 2px 8px; border-radius: 4px; font-size: 12px;">Neutral Site</span>' : ''}
            </div>
          </div>
        </div>
      `).join('')
      
      return `
        <div style="margin-bottom: 32px;">
          <h3 style="background-color: #2563eb; color: white; padding: 16px 24px; margin: 0; font-size: 20px; font-weight: 600; border-radius: 8px 8px 0 0;">
            ${formattedDate}
          </h3>
          <div style="background-color: #f9fafb; padding: 16px 24px; border-radius: 0 0 8px 8px;">
            <p style="color: #2563eb; margin: 0 0 16px 0; font-size: 16px;">
              ${games.length} game${games.length !== 1 ? 's' : ''}
            </p>
            ${dayGamesHTML}
          </div>
        </div>
      `
    }).join('')
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>NBA Schedule - ${weekRange}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
      <div style="background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <header style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 32px 24px; text-align: center;">
          <h1 style="margin: 0 0 8px 0; font-size: 32px; font-weight: bold;">NBA Schedule</h1>
          <h2 style="margin: 0; font-size: 24px; font-weight: 600; opacity: 0.9;">${weekRange}</h2>
        </header>
        
        <div style="padding: 32px 24px;">
          ${gamesHTML}
        </div>
        
        <footer style="background-color: #f3f4f6; padding: 16px 24px; text-align: center; color: #6b7280; font-size: 14px;">
          <p style="margin: 0;">Generated on ${new Date().toLocaleDateString('en-US', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}</p>
        </footer>
      </div>
    </body>
    </html>
  `
}

export async function POST(request: NextRequest) {
  try {
    const { weekData, recipientEmail } = await request.json()

    if (!weekData || !recipientEmail) {
      return NextResponse.json(
        { error: 'Missing required fields: weekData and recipientEmail' },
        { status: 400 }
      )
    }

    const weekRange = formatWeekRange(weekData.weekStart, weekData.weekEnd)
    const emailHTML = generateEmailHTML(weekData)

    const { data, error } = await resend.emails.send({
      from: 'Sports Schedule <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Sports Schedule - ${weekRange}`,
      html: emailHTML,
      replyTo: 'onboarding@resend.dev',
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json(
        { error: 'Failed to send email', details: error },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      messageId: data?.id,
      weekRange 
    })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
