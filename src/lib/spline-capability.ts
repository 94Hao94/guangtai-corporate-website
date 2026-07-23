/** Signals used to decide whether a browser can automatically start the 3D Hero. */
export interface SplineDeviceCapabilities {
  /** Current viewport width in CSS pixels. */
  viewportWidth: number;
  /** Whether the visitor has requested reduced motion. */
  reducedMotion: boolean;
  /** Reported logical processor count, when the browser exposes it. */
  hardwareConcurrency?: number;
  /** Reported device memory in gigabytes, when the browser exposes it. */
  deviceMemory?: number;
  /** Whether the visitor has enabled browser data saving. */
  saveData?: boolean;
  /** Reported connection type, when the browser exposes it. */
  effectiveType?: string;
}

/**
 * Decides whether a browser has the declared capacity to automatically start the 3D Hero.
 * @param capabilities - Viewport, accessibility, hardware, and network capability signals.
 * @returns `true` only for a capable desktop without data-saving or slow-network constraints.
 */
export function canAutoMountSplineHero(
  capabilities: SplineDeviceCapabilities,
): boolean {
  const {
    viewportWidth,
    reducedMotion,
    hardwareConcurrency,
    deviceMemory,
    saveData,
    effectiveType,
  } = capabilities;
  const slowNetwork = ['slow-2g', '2g', '3g'].includes(effectiveType ?? '');

  return (
    viewportWidth >= 901 &&
    !reducedMotion &&
    typeof hardwareConcurrency === 'number' &&
    hardwareConcurrency >= 8 &&
    typeof deviceMemory === 'number' &&
    deviceMemory >= 8 &&
    !saveData &&
    !slowNetwork
  );
}
