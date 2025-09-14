'use client'

import { useState } from 'react'
import { Calendar } from './ui/calendar'
import { format, isSameDay } from 'date-fns'

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

interface OptimizedGame extends Game {
  priority: number
  tvAssignment: number
  color: string
  reasoning: string
  assignedDate?: string
  assignedTimeSlot?: string
}

interface AICalendarProps {
  generatedCalendar: {
    optimizedGames: OptimizedGame[]
    tvSchedule: Record<number, OptimizedGame[]>
    recommendations: string[]
    weekSummary: string
  }
  weekStart: Date
  weekEnd: Date
  onGameClick: (game: Game) => void
}

export default function AICalendar({ 
  generatedCalendar, 
  weekStart, 
  weekEnd, 
  onGameClick 
}: AICalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  // Get games for a specific date
  const getGamesForDate = (date: Date) => {
    // Get unique games for this date (since AI assigns same game to multiple TVs)
    const gamesMap = new Map<string, OptimizedGame>()
    
    generatedCalendar.optimizedGames.forEach(game => {
      const gameDate = game.assignedDate ? new Date(game.assignedDate) : new Date(game.gameDateEst)
      if (isSameDay(gameDate, date)) {
        // Use gameId as key to avoid duplicates
        gamesMap.set(game.gameId, game)
      }
    })
    
    return Array.from(gamesMap.values())
  }

  // Get dates that have games
  const datesWithGames = generatedCalendar.optimizedGames.map(game => 
    game.assignedDate ? new Date(game.assignedDate) : new Date(game.gameDateEst)
  ).filter((date, index, self) => 
    index === self.findIndex(d => isSameDay(d, date))
  )

  // Get TV schedule for selected date
  const getTVScheduleForDate = (date: Date) => {
    const schedule: Record<number, OptimizedGame[]> = {}
    
    Object.entries(generatedCalendar.tvSchedule).forEach(([tvNumber, games]) => {
      schedule[parseInt(tvNumber)] = games.filter(game => {
        // Check both gameDateEst and assignedDate since the AI assigns dates differently
        const gameDate = game.assignedDate ? new Date(game.assignedDate) : new Date(game.gameDateEst)
        return isSameDay(gameDate, date)
      })
    })
    
    return schedule
  }

  const selectedDateGames = selectedDate ? getGamesForDate(selectedDate) : []
  const selectedDateTVSchedule = selectedDate ? getTVScheduleForDate(selectedDate) : {}
  const numberOfTVs = Object.keys(generatedCalendar.tvSchedule).length

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <h3 className="text-2xl font-bold flex items-center mb-2">
          <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI-Optimized Calendar
        </h3>
        <p className="text-purple-100">{generatedCalendar.weekSummary}</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 p-6">
        {/* Calendar Section */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-gray-900">Select a Day</h4>
          <div className="border rounded-lg p-4 bg-white">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={(date) => {
                // Only enable dates that have games and are within the week range
                return !datesWithGames.some(gameDate => isSameDay(gameDate, date)) ||
                       date < weekStart || 
                       date > weekEnd
              }}
              modifiers={{
                hasGames: datesWithGames
              }}
              modifiersStyles={{
                hasGames: { 
                  backgroundColor: '#3B82F6', 
                  color: 'white',
                  fontWeight: 'bold'
                }
              }}
              className="rounded-md border-0 w-full"
            />
          </div>
          
          {/* Legend */}
          <div className="mt-4 text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span>Days with games</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-200 rounded"></div>
                <span>No games</span>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Date Info */}
        <div>
          <h4 className="text-lg font-semibold mb-4 text-gray-900">
            {selectedDate ? format(selectedDate, 'EEEE, MMMM d, yyyy') : 'Select a date'}
          </h4>
          
          {selectedDate && selectedDateGames.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <div className="text-4xl mb-2">📅</div>
              <p>No games scheduled for this day</p>
            </div>
          )}

          {selectedDate && selectedDateGames.length > 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-sm font-medium text-blue-800 mb-1">
                  {selectedDateGames.length} game{selectedDateGames.length !== 1 ? 's' : ''} scheduled
                </div>
                <div className="text-xs text-blue-600">
                  Distributed across {numberOfTVs} TV{numberOfTVs !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Quick Games List */}
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Games Today:</h5>
                {selectedDateGames
                  .sort((a, b) => a.gameStatusText.localeCompare(b.gameStatusText))
                  .map(game => (
                    <div 
                      key={game.gameId}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => onGameClick(game)}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Day Badge */}
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold">
                          {format(game.assignedDate ? new Date(game.assignedDate) : new Date(game.gameDateEst), 'EEE').toUpperCase()}
                        </span>
                        <div>
                          <div className="font-medium text-sm">
                            {game.awayTeam.teamTricode} @ {game.homeTeam.teamTricode}
                          </div>
                          <div className="text-xs text-gray-600">
                            {game.gameStatusText}
                          </div>
                        </div>
                      </div>
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: game.color }}
                        title={`Priority: ${game.priority}/10`}
                      ></div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>

      {/* TV Schedule for Selected Date */}
      {selectedDate && selectedDateGames.length > 0 && (
        <div className="border-t bg-gray-50 p-6">
          <h4 className="text-lg font-semibold mb-4 text-gray-900">
            TV Schedule for {format(selectedDate, 'MMM d')}
          </h4>
          
          {/* Horizontal Scrollable TV Schedule */}
          <div className="overflow-x-auto">
            <div 
              className="flex space-x-4 pb-4"
              style={{ minWidth: `${numberOfTVs * 280}px` }}
            >
              {Object.entries(selectedDateTVSchedule)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([tvNumber, tvGames]) => (
                  <div 
                    key={tvNumber}
                    className="flex-shrink-0 w-64 bg-white rounded-xl border-2 border-gray-200 p-4"
                  >
                    {/* TV Header */}
                    <div className="flex items-center justify-center mb-4">
                      <div className="bg-gradient-to-r from-gray-800 to-gray-700 text-white px-4 py-2 rounded-lg font-bold text-sm">
                        📺 TV {tvNumber}
                      </div>
                    </div>
                    
                    {/* TV Games */}
                    {tvGames.length === 0 ? (
                      <div className="text-center py-6 text-gray-400">
                        <div className="text-2xl mb-2">📺</div>
                        <div className="text-sm">No games</div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {tvGames
                          .sort((a, b) => a.gameStatusText.localeCompare(b.gameStatusText))
                          .map((game, index) => (
                            <div key={`${game.gameId}-${index}`}>
                              {/* Game Card */}
                              <div 
                                className="p-3 rounded-lg cursor-pointer hover:scale-105 transition-all duration-200 shadow-sm border"
                                style={{ backgroundColor: game.color, borderColor: game.color }}
                                onClick={() => onGameClick(game)}
                                title={game.reasoning}
                              >
                                <div className="text-white">
                                  {/* Day of Week Badge */}
                                  <div className="flex justify-center mb-2">
                                    <span className="bg-white bg-opacity-20 text-white px-2 py-1 rounded-full text-xs font-bold">
                                      {format(game.assignedDate ? new Date(game.assignedDate) : new Date(game.gameDateEst), 'EEE').toUpperCase()}
                                    </span>
                                  </div>
                                  
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
                              {index < tvGames.length - 1 && (
                                <div className="flex justify-center py-2">
                                  <div className="text-gray-400">↓</div>
                                </div>
                              )}
                            </div>
                          ))
                        }
                      </div>
                    )}
                  </div>
                ))
              }
            </div>
          </div>

          {/* Scroll Hint */}
          {numberOfTVs > 4 && (
            <div className="text-center text-sm text-gray-500 mt-2">
              ← Scroll horizontally to see all {numberOfTVs} TVs →
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      <div className="border-t bg-blue-50 p-6">
        <h4 className="font-semibold text-blue-900 mb-3">AI Recommendations</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          {generatedCalendar.recommendations.map((rec: string, index: number) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="text-blue-600 mt-1">•</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
