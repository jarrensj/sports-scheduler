# sports scheduler

This project makes it easy for someone to get an automated email (daily and weekly) with a generated schedule of sporting events (and what broadcasts to tune into) to make sure their TVs are always showing an available sports with prioritization to their preferences with the help of ai agent deciding priorizatiom and negotation between what games to show on the TVs and what TVs to show them on.  

## Features

- **Live NBA Schedule**: Real-time NBA game data with dates, times, and broadcast information
- **Game Details Modal**: Click any game to see detailed matchup information, and broadcast detail
- **Visual Time-Based Calendar Layout**: Games positioned by actual start times with visual time grid
- **Favorite Teams Selection**: Choose your favorite NBA teams for priority scheduling
- **Multi-TV Setup**: Configure number of available TVs for optimal viewing
- **TV Setup Description**: Detailed description of your TV environment for AI-powered placement optimization
- **Location-Based Settings**: Zip code to help optimize for local sports teams
- **Persistent Storage**: Preferences saved locally and restored between sessions
- **OpenAI Integration**: Advanced AI analysis for intelligent game placement across multiple screens
- **Priority-Based Scheduling**: Games ranked by user preferences, team records, and game importance / significance
- **Prominence-Based Placement**: High-priority games assigned to most prominent/visible screens
- **Conflict Resolution**: Simultaneous games automatically assigned to different TVs
- **Location Intelligence**: AI analyzes TV setup descriptions (main dining, bar, kitchen areas)
- **Balanced Distribution**: Ensures every TV has engaging content for customer satisfaction
- **Viewing Hierarchy**: Prime games on main screens, secondary content on background TVs
- **TV Assignment Labels**: Clear TV numbers on each card
- **Interactive Calendar**: Hover effects and detailed game information on click
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Text Integration**: Send daily schedules directly to text messages for convenience
- **Email Integration**: Send weekly schedules directly to email addresses
- **Formatted HTML Emails**: Beautiful, responsive email templates with game details
- **Weekly Schedule Export**: Export optimized viewing plans for team coordination
- **Subscription automated**: Automated weekly schedule delivery of the sports schedule and their AI-optimized schedule
- **Featured restaurants**: People can see what restaurants are playing what games 

## Getting Started

set up env variables and fill your .env out:

```bash
cp .env.example .env
```

install dependencies:

```bash
npm install
```

run the development server:

```bash
npm run dev
```

open [http://localhost:3000](http://localhost:3000)
