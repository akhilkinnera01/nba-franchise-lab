export interface NavigationItem {
  label: string;
  href: string;
  description: string;
}

export const primaryNavigation: readonly NavigationItem[] = [
  {
    label: 'Home',
    href: '/',
    description: 'League command center and direct move entry.',
  },
  {
    label: 'Teams',
    href: '/teams',
    description: 'League ledger, filters, and franchise dossiers.',
  },
  {
    label: 'Scenarios',
    href: '/scenarios',
    description: 'Trade, free-agent, injury, and lineup verdicts.',
  },
  {
    label: 'Labs',
    href: '/labs',
    description: 'Draft, alternate-universe, rebuild, and shock labs.',
  },
  {
    label: 'Compare',
    href: '/compare',
    description: 'Read scenario deltas side by side.',
  },
] as const;

export const secondaryNavigation: readonly NavigationItem[] = [
  {
    label: 'Methodology',
    href: '/methodology',
    description: 'Formula notes, trust rails, and caveats.',
  },
  {
    label: 'Saved',
    href: '/saved',
    description: 'Scenario library, profile, reactions, and comments.',
  },
] as const;

export const featuredTeamShortcuts = [
  { label: 'Thunder', href: '/teams?highlight=1610612760' },
  { label: 'Knicks', href: '/teams?highlight=1610612752' },
  { label: 'Spurs', href: '/teams?highlight=1610612759' },
  { label: 'Open all teams', href: '/teams' },
] as const;
