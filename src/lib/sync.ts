// Picks a file path for each feature that isn't on GitHub yet. Names that
// slug the same, or slug to nothing, get a numbered suffix so no two
// features (or an already mapped file) share a path.
export function newFeaturePaths(
  features: { id: string; name: string }[],
  basePath: string,
  takenPaths: string[],
): Map<string, string> {
  const prefix = basePath ? `${basePath}/` : "";
  const taken = new Set(takenPaths.map((p) => p.toLowerCase()));
  const paths = new Map<string, string>();

  for (const feature of features) {
    const slug =
      feature.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "") || "feature";
    let path = `${prefix}${slug}.feature`;
    for (let n = 2; taken.has(path.toLowerCase()); n++) {
      path = `${prefix}${slug}_${n}.feature`;
    }
    taken.add(path.toLowerCase());
    paths.set(feature.id, path);
  }
  return paths;
}
