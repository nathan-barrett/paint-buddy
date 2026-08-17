import Dexie, { type EntityTable } from "dexie";
import type { Project, SchemeExport } from "./types";

export interface OwnedPaint {
  paintId: string;
}

const db = new Dexie("painting-buddy") as Dexie & {
  projects: EntityTable<Project, "id">;
  ownedPaints: EntityTable<OwnedPaint, "paintId">;
};

// Earlier schema versions (kept so existing browsers upgrade cleanly).
db.version(1).stores({ projects: "id, modelName, updatedAt" });
db.version(2).stores({ projects: "id, name, modelName, updatedAt" });
db.version(3).stores({
  projects: "id, name, modelName, updatedAt",
  models: "name",
  ownedPaints: "paintId",
});
db.version(4).stores({
  projects: "id, name, updatedAt",
  models: null,
  images: "name",
  ownedPaints: "paintId",
});

// v5: parts-list app. Drop the images table.
db.version(5).stores({
  projects: "id, name, updatedAt",
  images: null,
  ownedPaints: "paintId",
});

export { db };

// --- Paint inventory ---
export async function listOwnedPaintIds(): Promise<string[]> {
  return (await db.ownedPaints.toArray()).map((o) => o.paintId);
}

export async function setPaintOwned(paintId: string, owned: boolean): Promise<void> {
  if (owned) await db.ownedPaints.put({ paintId });
  else await db.ownedPaints.delete(paintId);
}

// --- Projects ---
const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export async function listProjects(): Promise<Project[]> {
  return db.projects.orderBy("updatedAt").reverse().toArray();
}

export async function getProject(id: string): Promise<Project | undefined> {
  return db.projects.get(id);
}

export async function saveProject(project: Project): Promise<void> {
  await db.projects.put({ ...project, updatedAt: Date.now() });
}

export async function deleteProject(id: string): Promise<void> {
  await db.projects.delete(id);
}

export function createProject(name: string): Project {
  return {
    id: newId(),
    name,
    parts: [],
    assignments: {},
    updatedAt: Date.now(),
  };
}

export function toScheme(project: Project): SchemeExport {
  return {
    app: "painting-buddy",
    version: 1,
    name: project.name,
    parts: project.parts,
    assignments: project.assignments,
  };
}

export function schemeToProject(scheme: SchemeExport): Project {
  const legacyPins = (scheme as { pins?: { id: string; label: string }[] }).pins;
  return {
    id: newId(),
    name: scheme.name || "Imported scheme",
    parts: scheme.parts ?? legacyPins?.map((p) => ({ id: p.id, label: p.label })) ?? [],
    assignments: scheme.assignments ?? {},
    updatedAt: Date.now(),
  };
}

/** Normalize a project loaded from storage: migrate legacy pins→parts, drop stale fields. */
export function sanitizeProject(p: Project): Project {
  const raw = p as Project & { pins?: { id: string; label: string }[] };
  const parts = raw.parts ?? raw.pins?.map((pn) => ({ id: pn.id, label: pn.label })) ?? [];
  return {
    id: p.id,
    name: p.name,
    parts,
    assignments: p.assignments ?? {},
    updatedAt: p.updatedAt,
  };
}

export function parseScheme(json: string): SchemeExport {
  const data = JSON.parse(json);
  if (data?.app !== "painting-buddy") {
    throw new Error("Not a Painting Buddy scheme file.");
  }
  return data as SchemeExport;
}
