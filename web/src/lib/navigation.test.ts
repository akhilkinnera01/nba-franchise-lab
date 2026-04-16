import { describe, expect, it } from 'vitest';

import { primaryNavigation } from '@/lib/navigation';

describe('navigation', () => {
  it('exposes the Phase 5 labs route in the primary shell navigation', () => {
    expect(
      primaryNavigation.some(
        (item) => item.label === 'Labs' && item.href === '/labs',
      ),
    ).toBe(true);
  });
});
