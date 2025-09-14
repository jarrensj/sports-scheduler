import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// NBA team logo utility
export function getTeamLogo(teamTricode: string): string {
  const logoMap: Record<string, string> = {
    'ATL': '/logos/nba/atl.svg',
    'BOS': '/logos/nba/bos.svg',
    'BKN': '/logos/nba/bkn.svg',
    'CHA': '/logos/nba/cha.svg',
    'CHI': '/logos/nba/chi.svg',
    'CLE': '/logos/nba/cle.svg',
    'DAL': '/logos/nba/dal.svg',
    'DEN': '/logos/nba/den.svg',
    'DET': '/logos/nba/det.svg',
    'GSW': '/logos/nba/gsw.svg',
    'HOU': '/logos/nba/hou.svg',
    'IND': '/logos/nba/ind.svg',
    'LAC': '/logos/nba/lac.svg',
    'LAL': '/logos/nba/lal.svg',
    'MEM': '/logos/nba/mem.svg',
    'MIA': '/logos/nba/mia.svg',
    'MIL': '/logos/nba/mil.svg',
    'MIN': '/logos/nba/min.svg',
    'NOP': '/logos/nba/nop.svg',
    'NYK': '/logos/nba/nyk.svg',
    'OKC': '/logos/nba/okc.svg',
    'ORL': '/logos/nba/orl.svg',
    'PHI': '/logos/nba/phi.svg',
    'PHX': '/logos/nba/phx.svg',
    'POR': '/logos/nba/por.svg',
    'SAC': '/logos/nba/sac.svg',
    'SAS': '/logos/nba/sas.svg',
    'TOR': '/logos/nba/tor.svg',
    'UTA': '/logos/nba/uta.svg',
    'WAS': '/logos/nba/was.svg'
  }
  
  return logoMap[teamTricode] || '/logos/nba/atl.svg' // fallback to Atlanta Hawks
}

