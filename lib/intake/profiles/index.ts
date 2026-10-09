import type { DatasetType } from '@/lib/evidence/model';
import type { ColumnMapping } from '@/lib/intake/interpreter';
import { toastProfile } from '@/lib/intake/profiles/toast';
import type { SourceProfile } from '@/lib/intake/profiles/types';

/**
 * Registered source profiles.
 * Add Square, Clover, Clover, etc. here later — highest detect() score wins.
 */
export const SOURCE_PROFILES: SourceProfile[] = [
  toastProfile,
  // Future: squareProfile, cloverProfile, squareProfile, ...
];

export function detectSourceProfile(
  fileName: string,
  headers: string[]
): SourceProfile | null {
  let best: SourceProfile | null = null;
  let bestScore = 0;
  for (const profile of SOURCE_PROFILES) {
    const score = profile.detect(fileName, headers);
    if (score > bestScore) {
      bestScore = score;
      best = profile;
    }
  }
  // Require a minimum signal so random CSVs do not get force-tagged.
  return bestScore >= 4 ? best : null;
}

export function classifyWithProfiles(
  fileName: string,
  headers: string[]
): DatasetType | null {
  const profile = detectSourceProfile(fileName, headers);
  return profile ? profile.classify(fileName, headers) : null;
}

export function mapWithProfiles(
  sourceColumn: string,
  dataset: DatasetType,
  fileName: string,
  headers: string[]
): ColumnMapping | null {
  const profile = detectSourceProfile(fileName, headers);
  if (!profile) return null;
  const hit = profile.mapColumn(sourceColumn, dataset, headers);
  if (!hit) return null;
  return { sourceColumn, ...hit };
}

export { TOAST_EXPORT_CHECKLIST } from '@/lib/intake/profiles/toast';
