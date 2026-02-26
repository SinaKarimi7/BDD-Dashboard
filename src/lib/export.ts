import JSZip from "jszip";
import { saveAs } from "file-saver";
import type { Feature } from "@/types";
import { featureToGherkin } from "@/lib/gherkin";
import { slugify } from "@/lib/utils";

export function exportSingleFeature(feature: Feature): void {
  const gherkin = featureToGherkin(feature);
  const blob = new Blob([gherkin], { type: "text/plain;charset=utf-8" });
  saveAs(blob, `${slugify(feature.name)}.feature`);
}

export async function exportAllFeatures(
  features: Feature[],
  projectName: string,
): Promise<void> {
  const zip = new JSZip();
  const root = zip.folder(slugify(projectName));
  if (!root) return;

  // Group by folder path
  const grouped = new Map<string, Feature[]>();
  for (const f of features) {
    const folder = f.folderPath || "features";
    if (!grouped.has(folder)) grouped.set(folder, []);
    grouped.get(folder)!.push(f);
  }

  for (const [folderPath, folderFeatures] of grouped) {
    const folder = root.folder(folderPath);
    if (!folder) continue;
    for (const feature of folderFeatures) {
      const gherkin = featureToGherkin(feature);
      folder.file(`${slugify(feature.name)}.feature`, gherkin);
    }
  }

  const content = await zip.generateAsync({ type: "blob" });
  saveAs(content, `${slugify(projectName)}-features.zip`);
}
