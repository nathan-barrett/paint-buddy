import Dexie, { type EntityTable } from "dexie";
import type { Project, SchemeExport } from "./types";

export interface StoredImage {
  name: string;
  data: ArrayBuffer;
}

export interface OwnedPaint {
  paintId: string;
}

const db = new Dexie("painting-buddy") as Dexie & {
  projects: EntityTable<Project, "id">;
  images: EntityTable<StoredImage, "name">;
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

// v4: image-only. Drop the 3D model table, add an images table.
db.version(4).stores({
  projects: "id, name, updatedAt",
  models: null,
  images: "name",
  ownedPaints: "paintId",
});

export { db };

// --- Image storage ---
export async function saveImageBlob(name: string, data: ArrayBuffer): Promise<void> {
  await db.images.put({ name, data });
}

export async function getImageBlob(name: string): Promise<ArrayBuffer | undefined> {
  return (await db.images.get(name))?.data;
}

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
    pins: [],
    assignments: {},
    updatedAt: Date.now(),
  };
}

export function toScheme(project: Project): SchemeExport {
  return {
    app: "painting-buddy",
    version: 1,
    name: project.name,
    imageName: project.imageName,
    pins: project.pins,
    assignments: project.assignments,
  };
}

export function schemeToProject(scheme: SchemeExport): Project {
  return {
    id: newId(),
    name: scheme.name || "Imported scheme",
    imageName: scheme.imageName,
    pins: scheme.pins ?? [],
    assignments: scheme.assignments ?? {},
    updatedAt: Date.now(),
  };
}

export function parseScheme(json: string): SchemeExport {
  const data = JSON.parse(json);
  if (data?.app !== "painting-buddy") {
    throw new Error("Not a Painting Buddy scheme file.");
  }
  return data as SchemeExport;
}
