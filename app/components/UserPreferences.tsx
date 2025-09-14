'use client'

import { useState, useEffect, useRef } from 'react'

interface UserPreferences {
  sportsInterests: string[]
  numberOfTvs: number
  tvSetupDescription: string
  favoriteNbaTeams: string[]
  zipCode: string
}

const NBA_TEAMS = [
  { value: 'ATL', label: 'Atlanta Hawks' },
  { value: 'BOS', label: 'Boston Celtics' },
  { value: 'BKN', label: 'Brooklyn Nets' },
  { value: 'CHA', label: 'Charlotte Hornets' },
  { value: 'CHI', label: 'Chicago Bulls' },
  { value: 'CLE', label: 'Cleveland Cavaliers' },
  { value: 'DAL', label: 'Dallas Mavericks' },
  { value: 'DEN', label: 'Denver Nuggets' },
  { value: 'DET', label: 'Detroit Pistons' },
  { value: 'GSW', label: 'Golden State Warriors' },
  { value: 'HOU', label: 'Houston Rockets' },
  { value: 'IND', label: 'Indiana Pacers' },
  { value: 'LAC', label: 'LA Clippers' },
  { value: 'LAL', label: 'Los Angeles Lakers' },
  { value: 'MEM', label: 'Memphis Grizzlies' },
  { value: 'MIA', label: 'Miami Heat' },
  { value: 'MIL', label: 'Milwaukee Bucks' },
  { value: 'MIN', label: 'Minnesota Timberwolves' },
  { value: 'NOP', label: 'New Orleans Pelicans' },
  { value: 'NYK', label: 'New York Knicks' },
  { value: 'OKC', label: 'Oklahoma City Thunder' },
  { value: 'ORL', label: 'Orlando Magic' },
  { value: 'PHI', label: 'Philadelphia 76ers' },
  { value: 'PHX', label: 'Phoenix Suns' },
  { value: 'POR', label: 'Portland Trail Blazers' },
  { value: 'SAC', label: 'Sacramento Kings' },
  { value: 'SAS', label: 'San Antonio Spurs' },
  { value: 'TOR', label: 'Toronto Raptors' },
  { value: 'UTA', label: 'Utah Jazz' },
  { value: 'WAS', label: 'Washington Wizards' }
]

interface UserPreferencesProps {
  onPreferencesChange?: (preferences: UserPreferences) => void
}

// Helper functions for localStorage operations
const STORAGE_KEY = 'sports-scheduler-user-preferences'

const loadPreferencesFromStorage = (): UserPreferences | null => {
  if (typeof window === 'undefined') return null
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load preferences from localStorage:', error)
  }
  return null
}

const savePreferencesToStorage = (preferences: UserPreferences): void => {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch (error) {
    console.error('Failed to save preferences to localStorage:', error)
  }
}

export default function UserPreferences({ onPreferencesChange }: UserPreferencesProps) {
  const [preferences, setPreferences] = useState<UserPreferences>({
    sportsInterests: [],
    numberOfTvs: 1,
    tvSetupDescription: '',
    favoriteNbaTeams: [],
    zipCode: ''
  })

  const [isExpanded, setIsExpanded] = useState(false)
  const onPreferencesChangeRef = useRef(onPreferencesChange)

  // Update ref when callback changes
  useEffect(() => {
    onPreferencesChangeRef.current = onPreferencesChange
  }, [onPreferencesChange])

  // Load preferences from localStorage on component mount
  useEffect(() => {
    const savedPreferences = loadPreferencesFromStorage()
    if (savedPreferences) {
      setPreferences(savedPreferences)
      onPreferencesChangeRef.current?.(savedPreferences)
    }
  }, []) // Empty dependency array - only run on mount

  const handlePreferenceChange = (newPreferences: Partial<UserPreferences>) => {
    const updated = { ...preferences, ...newPreferences }
    setPreferences(updated)
    savePreferencesToStorage(updated)
    onPreferencesChangeRef.current?.(updated)
  }

  const handleSportsInterestChange = (sport: string) => {
    const updatedInterests = preferences.sportsInterests.includes(sport)
      ? preferences.sportsInterests.filter(s => s !== sport)
      : [...preferences.sportsInterests, sport]
    
    handlePreferenceChange({ sportsInterests: updatedInterests })
  }

  const handleNbaTeamChange = (teamValue: string) => {
    const updatedTeams = preferences.favoriteNbaTeams.includes(teamValue)
      ? preferences.favoriteNbaTeams.filter(t => t !== teamValue)
      : [...preferences.favoriteNbaTeams, teamValue]
    
    handlePreferenceChange({ favoriteNbaTeams: updatedTeams })
  }

  return (
    <div className="bg-white rounded-lg shadow-md mb-8">
      {/* Header */}
      <div 
        className="flex justify-between items-center p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div>
          <h2 className="text-xl font-semibold text-gray-900">User Preferences</h2>
          <p className="text-gray-600 text-sm">Customize your sports viewing experience</p>
        </div>
        <div className="flex items-center space-x-2">
          {!isExpanded && preferences.favoriteNbaTeams.length > 0 && (
            <div className="flex items-center space-x-1">
              {preferences.favoriteNbaTeams.slice(0, 2).map(teamValue => (
                <span key={teamValue} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                  {NBA_TEAMS.find(team => team.value === teamValue)?.label}
                </span>
              ))}
              {preferences.favoriteNbaTeams.length > 2 && (
                <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">
                  +{preferences.favoriteNbaTeams.length - 2}
                </span>
              )}
            </div>
          )}
          <svg 
            className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Form Content */}
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-gray-100">
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            {/* Sports Interests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Sports Interests
                  <span className="text-gray-400 text-xs ml-2">(Coming Soon)</span>
              </label>trubte ace T
              <div className="space-y-2 opacity-50 pointer-events-none">
                {['Basketball', 'Football', 'Baseball', 'Hockey', 'Soccer', 'Tennis'].map((sport) => (
                  <label key={sport} className="flex items-center">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={preferences.sportsInterests.includes(sport)}
                      onChange={() => handleSportsInterestChange(sport)}
                      disabled
                    />
                    <span className="ml-2 text-sm text-gray-700">{sport}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select the sports you&apos;re most interested in following
              </p>
            </div>

            {/* Number of TVs */}
            <div>
              <label htmlFor="numberOfTvs" className="block text-sm font-medium text-gray-700 mb-2">
                Number of TVs Available
              </label>
              <div className="relative">
                <input
                  id="numberOfTvs"
                  type="number"
                  min="1"
                  max="10"
                  value={preferences.numberOfTvs}
                  onChange={(e) => {
                    const value = e.target.value === '' ? 1 : Math.max(1, Math.min(10, parseInt(e.target.value) || 1))
                    handlePreferenceChange({ numberOfTvs: value })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                How many TVs can you watch simultaneously?
              </p>
            </div>

            {/* TV Setup Description */}
            <div className="md:col-span-2">
              <label htmlFor="tvSetupDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Describe Your TV Setup
              </label>
              <textarea
                id="tvSetupDescription"
                rows={3}
                value={preferences.tvSetupDescription}
                onChange={(e) => handlePreferenceChange({ tvSetupDescription: e.target.value })}
                placeholder="e.g., 65' main TV in living room, 32' in kitchen, projector in basement. Main TV has surround sound..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Help AI optimize your viewing experience by describing your TV locations, sizes, audio setup, etc.
              </p>
            </div>

            {/* Favorite NBA Teams */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Favorite NBA Teams
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {NBA_TEAMS.map((team) => (
                    <label key={team.value} className="flex items-center hover:bg-white hover:shadow-sm p-2 rounded cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={preferences.favoriteNbaTeams.includes(team.value)}
                        onChange={() => handleNbaTeamChange(team.value)}
                      />
                      <span className="ml-2 text-sm text-gray-700 flex-1">{team.label}</span>
                      <span className="ml-1 text-xs text-gray-400 font-mono">{team.value}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Select multiple teams - their games will be highlighted ({preferences.favoriteNbaTeams.length} selected)
              </p>
            </div>

            {/* Zip Code */}
            <div>
              <label htmlFor="zipCode" className="block text-sm font-medium text-gray-700 mb-2">
                Zip Code
              </label>
              <input
                id="zipCode"
                type="text"
                pattern="[0-9]{5}(-[0-9]{4})?"
                placeholder="12345"
                value={preferences.zipCode}
                onChange={(e) => handlePreferenceChange({ zipCode: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Used for local broadcast information and timezone
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-gray-100 space-y-3 sm:space-y-0 sm:space-x-3">
            {/* Subscription Button */}
            <button
              onClick={() => alert('Email subscription feature coming soon! 🚀')}
              className="w-full sm:w-auto px-6 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all font-medium shadow-md hover:shadow-lg transform hover:scale-105 flex items-center justify-center space-x-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Subscribe to AI Weekly Schedule</span>
            </button>

            {/* Save Button */}
            <button
              onClick={() => setIsExpanded(false)}
              className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save Preferences
            </button>
          </div>

          {/* Current Preferences Summary */}
          {(preferences.favoriteNbaTeams.length > 0 || preferences.zipCode || preferences.numberOfTvs > 1 || preferences.tvSetupDescription) && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Settings:</h4>
              <div className="flex flex-wrap gap-2">
                {preferences.favoriteNbaTeams.length > 0 && (
                  <>
                    {preferences.favoriteNbaTeams.slice(0, 3).map(teamValue => (
                      <span key={teamValue} className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {NBA_TEAMS.find(team => team.value === teamValue)?.label}
                      </span>
                    ))}
                    {preferences.favoriteNbaTeams.length > 3 && (
                      <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded text-sm">
                        +{preferences.favoriteNbaTeams.length - 3} more teams
                      </span>
                    )}
                  </>
                )}
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                  TVs: {preferences.numberOfTvs}
                </span>
                {preferences.zipCode && (
                  <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded text-sm">
                    Zip: {preferences.zipCode}
                  </span>
                )}
                {preferences.tvSetupDescription && (
                  <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-sm">
                    TV Setup: {preferences.tvSetupDescription.length > 50 ? 
                      preferences.tvSetupDescription.substring(0, 47) + '...' : 
                      preferences.tvSetupDescription}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
