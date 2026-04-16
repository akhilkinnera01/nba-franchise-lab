export function formatCurrencyShort(cents: number | null): string {
  if (cents === null) {
    return 'Unavailable';
  }

  const millions = cents / 100_000_000;
  return (
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: millions >= 100 ? 0 : 1,
      minimumFractionDigits: millions >= 100 ? 0 : 1,
    })
      .format(millions)
      .replace('.0', '') + 'M'
  );
}

export function formatSignedNumber(value: number | null, digits = 1): string {
  if (value === null) {
    return 'Unavailable';
  }

  return `${value > 0 ? '+' : ''}${value.toFixed(digits)}`;
}

export function formatWinLoss(
  wins: number | null,
  losses: number | null,
): string {
  if (wins === null || losses === null) {
    return 'No record';
  }

  return `${wins}-${losses}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
