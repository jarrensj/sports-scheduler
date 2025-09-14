import { getTeamLogo } from '@/lib/utils'

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

interface GameCalendarCardProps {
  game: Game
  position: { top: number; left: number; width: number }
  onGameClick: (game: Game) => void
  optimizedColor?: string
  tvAssignments?: number[]  // Changed to array to show multiple TVs
  priority?: number
  favoriteTeams?: string[]  // Array of favorite team tricodes
}

export function GameCalendarCard({ game, position, onGameClick, optimizedColor, tvAssignments, priority, favoriteTeams = [] }: GameCalendarCardProps) {
  // Helper function to convert game time from ET to PT for display
  const convertToPacificTime = (gameStatusText: string) => {
    const timeMatch = gameStatusText.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i)
    if (!timeMatch) return gameStatusText
    
    let hours = parseInt(timeMatch[1])
    const minutes = parseInt(timeMatch[2])
    const period = timeMatch[3].toLowerCase()
    
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    
    // Convert from ET to PT (subtract 3 hours)
    hours = (hours - 3 + 24) % 24
    
    const displayPeriod = hours >= 12 ? 'pm' : 'am'
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
    
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${displayPeriod} PT`
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

  // Check if this game contains any favorite teams
  const isFavoriteGame = favoriteTeams.includes(game.homeTeam.teamTricode) || 
                        favoriteTeams.includes(game.awayTeam.teamTricode)

  // Check broadcast status for color coding
  const hasBroadcastInfo = getAllBroadcasters(game.broadcasters).length > 0
  const hasAwayTvBroadcast = game.broadcasters.awayTvBroadcasters.some(
    broadcaster => broadcaster.broadcasterDisplay !== 'TBD' && broadcaster.broadcasterDisplay
  )

  // Generate dynamic styles based on optimization
  const cardStyle = optimizedColor ? {
    top: `${position.top}%`,
    left: `${Math.max(0, position.left)}%`,
    width: `${Math.min(position.width, 100 - Math.max(0, position.left))}%`,
    minHeight: '80px',
    maxWidth: '100%',
    backgroundColor: optimizedColor,
    borderColor: optimizedColor,
    borderWidth: '3px'
  } : {
    top: `${position.top}%`,
    left: `${Math.max(0, position.left)}%`,
    width: `${Math.min(position.width, 100 - Math.max(0, position.left))}%`,
    minHeight: '80px',
    maxWidth: '100%'
  }

  // Determine card styling based on broadcast status and favorite teams
  const getCardClassName = () => {
    if (optimizedColor) {
      return "absolute border-2 rounded-lg p-2 text-xs hover:shadow-lg transition-all hover:z-20 cursor-pointer transform hover:scale-105"
    }

    // Priority order: Favorite games > Away TV > Missing broadcast > Regular
    if (isFavoriteGame) {
      return "absolute bg-gradient-to-br from-blue-200 to-blue-300 border-2 border-blue-400 rounded-lg p-2 text-xs hover:shadow-lg hover:from-blue-300 hover:to-blue-400 hover:border-blue-500 transition-all hover:z-20 cursor-pointer transform hover:scale-105"
    } else if (hasAwayTvBroadcast) {
      return "absolute bg-gradient-to-br from-red-50 to-red-100 border-2 border-red-200 rounded-lg p-2 text-xs hover:shadow-lg hover:from-red-100 hover:to-red-200 hover:border-red-400 transition-all hover:z-20 cursor-pointer transform hover:scale-105"
    } else if (!hasBroadcastInfo) {
      return "absolute bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-lg p-2 text-xs hover:shadow-lg hover:from-yellow-100 hover:to-yellow-200 hover:border-yellow-400 transition-all hover:z-20 cursor-pointer transform hover:scale-105"
    } else {
      return "absolute bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-2 text-xs hover:shadow-lg hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 transition-all hover:z-20 cursor-pointer transform hover:scale-105"
    }
  }

  const cardClassName = getCardClassName()

  return (
    <div
      className={cardClassName}
      style={cardStyle}
      onClick={() => onGameClick(game)}
    >
      {/* TV Assignment indicators */}
      {tvAssignments && tvAssignments.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {tvAssignments.slice(0, 6).map(tvNum => (
            <div key={tvNum} className="bg-gray-800 text-white px-1 py-0.5 rounded text-xs font-bold">
              TV{tvNum}
            </div>
          ))}
          {tvAssignments.length > 6 && (
            <div className="bg-gray-600 text-white px-1 py-0.5 rounded text-xs font-bold">
              +{tvAssignments.length - 6}
            </div>
          )}
        </div>
      )}

      {/* Game Time */}
      <div className={`font-bold mb-1 text-center text-xs ${
        optimizedColor ? 'text-gray-800' : 
        isFavoriteGame ? 'text-blue-800' :
        hasAwayTvBroadcast ? 'text-red-700' :
        !hasBroadcastInfo ? 'text-yellow-700' :
        'text-blue-700'
      }`}>
        {convertToPacificTime(game.gameStatusText)}
      </div>
      
      {/* Teams */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center space-x-1">
          <img 
            src={getTeamLogo(game.awayTeam.teamTricode)} 
            alt={`${game.awayTeam.teamTricode} logo`}
            className="w-4 h-4 object-contain"
          />
          <span className={`font-bold text-xs ${
            optimizedColor ? 'text-gray-800' : 
            isFavoriteGame ? 'text-blue-900' :
            hasAwayTvBroadcast ? 'text-red-800' :
            !hasBroadcastInfo ? 'text-yellow-800' :
            'text-blue-800'
          }`}>{game.awayTeam.teamTricode}</span>
        </div>
        <span className="text-gray-600 font-bold text-xs">@</span>
        <div className="flex items-center space-x-1">
          <img 
            src={getTeamLogo(game.homeTeam.teamTricode)} 
            alt={`${game.homeTeam.teamTricode} logo`}
            className="w-4 h-4 object-contain"
          />
          <span className={`font-bold text-xs ${
            optimizedColor ? 'text-gray-800' : 
            isFavoriteGame ? 'text-blue-900' :
            hasAwayTvBroadcast ? 'text-red-800' :
            !hasBroadcastInfo ? 'text-yellow-800' :
            'text-blue-800'
          }`}>{game.homeTeam.teamTricode}</span>
        </div>
      </div>

      {/* Special Event Label */}
      {game.gameSubLabel && (
        <div className="text-center mb-1">
          <span className="bg-orange-200 text-orange-800 px-1 py-0.5 rounded text-xs font-bold">
            {game.gameSubLabel.length > 15 ? game.gameSubLabel.substring(0, 12) + '...' : game.gameSubLabel}
          </span>
        </div>
      )}

      {/* Broadcast Information */}
      <div className={`border-t pt-1 mt-1 ${
        optimizedColor ? 'border-gray-200' :
        isFavoriteGame ? 'border-blue-300' :
        hasAwayTvBroadcast ? 'border-red-200' :
        !hasBroadcastInfo ? 'border-yellow-200' :
        'border-blue-200'
      }`}>
        {getAllBroadcasters(game.broadcasters).length > 0 ? (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <svg className="w-2 h-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className={`font-bold text-xs truncate ${
                optimizedColor ? 'text-gray-800' :
                isFavoriteGame ? 'text-blue-800' :
                hasAwayTvBroadcast ? 'text-red-700' :
                !hasBroadcastInfo ? 'text-yellow-700' :
                'text-green-800'
              }`}>
                {getAllBroadcasters(game.broadcasters)[0].length > 8 ? 
                  getAllBroadcasters(game.broadcasters)[0].substring(0, 8) + '...' : 
                  getAllBroadcasters(game.broadcasters)[0]
                }
              </span>
            </div>
            {getAllBroadcasters(game.broadcasters).length > 1 && (
              <div className={`text-xs font-medium ${
                optimizedColor ? 'text-gray-600' :
                isFavoriteGame ? 'text-blue-600' :
                hasAwayTvBroadcast ? 'text-red-600' :
                !hasBroadcastInfo ? 'text-yellow-600' :
                'text-green-700'
              }`}>
                +{getAllBroadcasters(game.broadcasters).length - 1}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <svg className="w-2 h-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className={`font-bold text-xs ${
                optimizedColor ? 'text-gray-600' :
                isFavoriteGame ? 'text-blue-600' :
                hasAwayTvBroadcast ? 'text-red-600' :
                !hasBroadcastInfo ? 'text-yellow-600' :
                'text-gray-600'
              }`}>TBD</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
