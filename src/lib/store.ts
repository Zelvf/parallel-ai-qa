import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ScanRun } from "./types";

const root = path.join(process.cwd(), ".parallel", "runs");
const cache = new Map<string, ScanRun>();

export async function saveRun(run: ScanRun) {
  cache.set(run.id, structuredClone(run));
  await mkdir(root, { recursive: true });
  const file = path.join(root, `${run.id}.json`);
  await writeFile(file, JSON.stringify(run, null, 2));
}

export async function getRun(id: string): Promise<ScanRun | null> {
  if (!/^[a-z0-9-]+$/.test(id)) return null;
  if (cache.has(id)) return structuredClone(cache.get(id)!);
  try {
    return JSON.parse(await readFile(path.join(root, `${id}.json`), "utf8")) as ScanRun;
  } catch {
    return null;
  }
}

export async function listRuns(): Promise<ScanRun[]> {
  try {
    const files = (await readdir(root)).filter((name) => name.endsWith(".json"));
    const runs = await Promise.all(
      files.map(async (name) => {
        try {
          return JSON.parse(await readFile(path.join(root, name), "utf8")) as ScanRun;
        } catch {
          return null;
        }
      }),
    );
    return runs
      .filter((run): run is ScanRun => run !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 30);
  } catch {
    return [];
  }
}
