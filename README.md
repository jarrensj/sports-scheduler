# sports scheduler

This project makes it easy for someone to get an automated text with a generated schedule of sporting events (and what broadcasts to tune into) to make sure their TVs are always showing an available sports with prioritization to their preferences.


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

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
