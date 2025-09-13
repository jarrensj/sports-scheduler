import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch('https://cdn.nba.com/static/json/staticData/scheduleLeagueV2.json', {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching NBA schedule:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NBA schedule' },
      { status: 500 }
    )
  }
}