import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import PaintLibrary from "./components/PaintLibrary";
import PartPanel, { type Target } from "./components/PartPanel";
import ProjectBar from "./components/ProjectBar";
import MatchPanel, { type MatchTarget } from "./components/MatchPanel";
import ShoppingList from "./components/ShoppingList";
import {
  createProject,
  deleteProject as dbDelete,
  getProject,
  listOwnedPaintIds,
  listProjects,
  parseScheme,
  sanitizeProject,
  saveProject,
  schemeToProject,
  setPaintOwned,
  toScheme,
} from "./db";
import { exportProjectPng } from "./export";
import { normalizeAssignments } from "./recipe";
import { paintById } from "./data/paints";
import type { PaintStepType, Project } from "./types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export default function App() {
  const [project, setProject] = useState<Project | null>(null);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<Target>({ kind: "slot", type: "Base" });
  const [matchTarget, setMatchTarget] = useState<MatchTarget | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const projects = useLiveQuery(() => listProjects(), [], [] as Project[]);
  const ownedList = useLiveQuery(() => listOwnedPaintIds(), [], [] as string[]);
  const ownedIds = useMemo(() => new Set(ownedList ?? []), [ownedList]);

  const openProject = useCallback((p: Project | undefined | null) => {
    let proj = p ? sanitizeProject(p) : null;
    if (proj) {
      const { assignments, changed } = normalizeAssignments(proj.assignments);
      proj = { ...proj, assignments };
      if (changed || JSON.stringify(proj) !== JSON.stringify(p)) void saveProject(proj);
    }
    setProject(proj);
    setSelectedPartId(null);
    setActiveTarget({ kind: "slot", type: "Base" });
    setMatchTarget(null);
  }, []);

  useEffect(() => {
    (async () => {
      const existing = await listProjects();
      if (existing.length > 0) openProject(existing[0]);
      else {
        const p = createProject("My First Scheme");
        await saveProject(p);
        setProject(p);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchProject = useCallback((updater: (p: Project) => Project) => {
    setProject((prev) => {
      if (!prev) return prev;
      const next = updater(prev);
      void saveProject(next);
      return next;
    });
  }, []);

  // --- Parts & recipes ---
  const selectPart = (id: string | null) => {
    setSelectedPartId(id);
    setActiveTarget({ kind: "slot", type: "Base" });
  };

  const addPart = () => {
    const label = window.prompt("Part name (e.g. Helmet, Shoulder Pads, Bolter)", "");
    if (!label?.trim()) return;
    const id = uid();
    patchProject((p) => ({ ...p, parts: [...p.parts, { id, label: label.trim() }] }));
    selectPart(id);
  };

  const renamePart = (id: string, label: string) =>
    patchProject((p) => ({ ...p, parts: p.parts.map((pt) => (pt.id === id ? { ...pt, label } : pt)) }));

  const deletePart = (id: string) => {
    patchProject((p) => {
      const assignments = { ...p.assignments };
      delete assignments[id];
      return { ...p, parts: p.parts.filter((pt) => pt.id !== id), assignments };
    });
    setSelectedPartId((cur) => (cur === id ? null : cur));
  };

  const pickPaint = (paintId: string) => {
    if (!selectedPartId) return;
    const target = activeTarget;
    patchProject((p) => {
      const steps = [...(p.assignments[selectedPartId] ?? [])];
      if (target.kind === "slot") {
        const idx = steps.findIndex((s) => !s.extra && s.type === target.type);
        const step = { type: target.type, paintId };
        if (idx >= 0) steps[idx] = step;
        else steps.push(step);
      } else {
        steps.push({ type: target.type, paintId, extra: true });
      }
      return { ...p, assignments: { ...p.assignments, [selectedPartId]: steps } };
    });
  };

  const clearSlot = (partId: string, type: PaintStepType) =>
    patchProject((p) => ({
      ...p,
      assignments: {
        ...p.assignments,
        [partId]: (p.assignments[partId] ?? []).filter((s) => !(!s.extra && s.type === type)),
      },
    }));

  const removeExtra = (partId: string, extraIndex: number) =>
    patchProject((p) => {
      let seen = -1;
      const next = (p.assignments[partId] ?? []).filter((s) => {
        if (!s.extra) return true;
        seen++;
        return seen !== extraIndex;
      });
      return { ...p, assignments: { ...p.assignments, [partId]: next } };
    });

  // --- Inventory & matching ---
  const toggleOwn = (paintId: string) => setPaintOwned(paintId, !ownedIds.has(paintId));

  const inspectPaint = (paintId: string) => {
    const p = paintById(paintId);
    if (!p) return;
    setMatchTarget({
      hex: p.hex,
      title: `Similar to ${p.name}`,
      excludePaintId: p.id,
      excludeLine: p.line,
      onePerLine: true,
    });
  };

  const matchColor = (hex: string) => setMatchTarget({ hex, title: `Nearest to ${hex.toUpperCase()}` });

  // --- Project management ---
  const switchProject = async (id: string) => {
    const p = await getProject(id);
    if (p) openProject(p);
  };

  const newProject = async () => {
    const name = window.prompt("New project name", "Untitled scheme");
    if (!name?.trim()) return;
    const p = createProject(name.trim());
    await saveProject(p);
    setProject(p);
    setSelectedPartId(null);
    setActiveTarget({ kind: "slot", type: "Base" });
  };

  const renameProject = (name: string) => patchProject((p) => ({ ...p, name }));

  const deleteProject = async () => {
    if (!project) return;
    await dbDelete(project.id);
    const rest = await listProjects();
    openProject(rest[0] ?? null);
  };

  const exportScheme = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(toScheme(project), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pbscheme.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importScheme = async (file: File) => {
    setError(null);
    try {
      const p = schemeToProject(parseScheme(await file.text()));
      await saveProject(p);
      openProject(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const exportPng = async () => {
    if (!project) return;
    setError(null);
    try {
      await exportProjectPng({ name: project.name, parts: project.parts, assignments: project.assignments });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const parts = project?.parts ?? [];
  const assignments = project?.assignments ?? {};

  const usedPaintIds = useMemo(() => {
    const s = new Set<string>();
    Object.values(assignments).forEach((steps) => steps.forEach((st) => s.add(st.paintId)));
    return s;
  }, [assignments]);

  const neededPaints = useMemo(
    () =>
      [...usedPaintIds]
        .filter((id) => !ownedIds.has(id))
        .map(paintById)
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [usedPaintIds, ownedIds]
  );

  return (
    <div className="app">
      <header>
        <h1>🎨 Painting Buddy</h1>
        <ProjectBar
          projects={projects ?? []}
          currentId={project?.id ?? null}
          onSwitch={switchProject}
          onNew={newProject}
          onRename={renameProject}
          onDelete={deleteProject}
          onExport={exportScheme}
          onImport={importScheme}
        />
        <div className="actions">
          <button onClick={() => setShowShopping(true)} title="Paints this scheme needs">
            🛒 {neededPaints.length}
          </button>
          <button onClick={exportPng} disabled={parts.length === 0} title="Download recipe sheet as PNG">
            ⬇ PNG
          </button>
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <main>
        <section className="parts-main">
          <PartPanel
            parts={parts}
            assignments={assignments}
            selectedPartId={selectedPartId}
            activeTarget={activeTarget}
            onAddPart={addPart}
            onSelectPart={selectPart}
            onSetTarget={setActiveTarget}
            onRenamePart={renamePart}
            onDeletePart={deletePart}
            onClearSlot={clearSlot}
            onRemoveExtra={removeExtra}
          />
        </section>

        <aside className="sidebar">
          {matchTarget && (
            <MatchPanel
              target={matchTarget}
              ownedIds={ownedIds}
              onPick={(id) => {
                pickPaint(id);
                setMatchTarget(null);
              }}
              onInspect={inspectPaint}
              onToggleOwn={toggleOwn}
              onClose={() => setMatchTarget(null)}
            />
          )}
          <PaintLibrary
            disabled={!selectedPartId}
            hint={
              selectedPartId
                ? `Pick a paint for ${activeTarget.type}${activeTarget.kind === "extra" ? " (extra)" : ""}.`
                : "Select a part to assign paint."
            }
            ownedIds={ownedIds}
            onPick={pickPaint}
            onToggleOwn={toggleOwn}
            onInspect={inspectPaint}
            onPickColor={matchColor}
          />
        </aside>
      </main>

      {showShopping && (
        <ShoppingList
          projectName={project?.name ?? "scheme"}
          needed={neededPaints}
          ownedCount={ownedIds.size}
          usedCount={usedPaintIds.size}
          onToggleOwn={toggleOwn}
          onClose={() => setShowShopping(false)}
        />
      )}
    </div>
  );
}
