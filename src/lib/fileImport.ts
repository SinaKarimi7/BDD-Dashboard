export const ACCEPTED_FEATURE_EXTENSIONS = [".feature", ".txt"];
export const MAX_FEATURE_FILE_BYTES = 1024 * 1024;

/**
 * Splits picked or dropped files into ones worth reading and per-file errors.
 * Goes by extension rather than MIME type, since browsers label all sorts of
 * files "text/plain" and leave .feature files untyped.
 */
export function screenFeatureFiles<T extends { name: string; size: number }>(
  files: T[],
): { accepted: T[]; errors: string[] } {
  const accepted: T[] = [];
  const errors: string[] = [];
  for (const file of files) {
    const name = file.name.toLowerCase();
    if (!ACCEPTED_FEATURE_EXTENSIONS.some((ext) => name.endsWith(ext))) {
      errors.push(`${file.name}: not a .feature file`);
    } else if (file.size > MAX_FEATURE_FILE_BYTES) {
      errors.push(`${file.name}: larger than 1 MB`);
    } else {
      accepted.push(file);
    }
  }
  return { accepted, errors };
}
