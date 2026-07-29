import { describe, expect, it } from 'vitest';
import {
  canAutoMountSplineHero,
  type SplineDeviceCapabilities,
} from '../src/lib/spline-capability';

const capableDesktop: SplineDeviceCapabilities = {
  viewportWidth: 1440,
  reducedMotion: false,
  hardwareConcurrency: 8,
  deviceMemory: 8,
  saveData: false,
  effectiveType: '4g',
};

describe('canAutoMountSplineHero', () => {
  it('allows a capable desktop on an unrestricted connection', () => {
    expect(canAutoMountSplineHero(capableDesktop)).toBe(true);
  });

  it.each<Partial<SplineDeviceCapabilities>>([
    { viewportWidth: 900 },
    { reducedMotion: true },
    { hardwareConcurrency: 4 },
    { deviceMemory: 4 },
    { saveData: true },
    { effectiveType: '3g' },
    { hardwareConcurrency: undefined },
    { deviceMemory: undefined },
  ])(
    'keeps the static Hero when a required signal is insufficient: %o',
    (override) => {
      expect(canAutoMountSplineHero({ ...capableDesktop, ...override })).toBe(
        false,
      );
    },
  );
});
