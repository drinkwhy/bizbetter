import type { DatasetType } from '@/lib/evidence/model';

/** Mapping suggestion returned by a source profile (Toast, Square, …). */
export interface ColumnMappingHint {
  targetField: string;
  confidence: number;
  reason: string;
  confirmed: boolean;
}

/** One POS/source profile that can auto-detect and map common export formats. */
export interface SourceProfile {
  /** Stable id used in reasons and future analytics (e.g. 'toast'). */
  id: string;
  /** Human label for UI / audit reasons. */
  label: string;
  /** Detect whether this profile owns the file. Higher score wins. */
  detect: (fileName: string, headers: string[]) => number;
  /** Preferred dataset classification when this profile matches. */
  classify: (fileName: string, headers: string[]) => DatasetType | null;
  /** High-confidence column mappings for this source. */
  mapColumn: (
    sourceColumn: string,
    dataset: DatasetType,
    headers: string[]
  ) => ColumnMappingHint | null;
}
