interface Team {
  teamId: number
  teamName: string
  teamCity: string
  teamTricode: string
  teamSlug: string
  wins: number
  losses: numbernerate
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
}

export function GameCalendarCard({ game, position, onGameClick, optimizedColor, tvAssignments, priority }: GameCalendarCardProps) {
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

  const cardClassName = optimizedColor ? 
    "absolute border-2 rounded-lg p-2 text-xs hover:shadow-lg transition-all hover:z-20 cursor-pointer transform hover:scale-105" :
    "absolute bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-200 rounded-lg p-2 text-xs hover:shadow-lg hover:from-blue-100 hover:to-blue-200 hover:border-blue-400 transition-all hover:z-20 cursor-pointer transform hover:scale-105"

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
      <div className={`font-bold mb-1 text-center text-xs ${optimizedColor ? 'text-gray-800' : 'text-blue-700'}`}>
        {game.gameStatusText}
      </div>
      
      {/* Teams */}
      <div className="flex items-center justify-between mb-1">
        <span className="font-bold text-gray-800 text-xs">{game.awayTeam.teamTricode}</span>
        <span className="text-gray-600 font-bold text-xs">@</span>
        <span className="font-bold text-gray-800 text-xs">{game.homeTeam.teamTricode}</span>
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
      <div className="border-t border-blue-200 pt-1 mt-1">
        {getAllBroadcasters(game.broadcasters).length > 0 ? (
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1">
              <svg className="w-2 h-2 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-green-800 font-bold text-xs truncate">
                {getAllBroadcasters(game.broadcasters)[0].length > 8 ? 
                  getAllBroadcasters(game.broadcasters)[0].substring(0, 8) + '...' : 
                  getAllBroadcasters(game.broadcasters)[0]
                }
              </span>
            </div>
            {getAllBroadcasters(game.broadcasters).length > 1 && (
              <div className="text-green-700 text-xs font-medium">
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
              <span className="text-gray-600 font-bold text-xs">TBD</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
