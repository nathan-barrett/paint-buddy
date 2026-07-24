import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import ImageAnnotator from "./components/ImageAnnotator";
import PaintLibrary from "./components/PaintLibrary";
import PinPanel from "./components/PinPanel";
import ProjectBar from "./components/ProjectBar";
import MatchPanel, { type MatchTarget } from "./components/MatchPanel";
import ShoppingList from "./components/ShoppingList";
import {
  createProject,
  deleteProject as dbDelete,
  getImageBlob,
  getProject,
  listOwnedPaintIds,
  listProjects,
  parseScheme,
  saveImageBlob,
  saveProject,
  schemeToProject,
  setPaintOwned,
  toScheme,
} from "./db";
import { LOCAL_IMAGES } from "./data/localImages";
import { paintById } from "./data/paints";
import { STEP_TYPES, type PaintStepType, type Project } from "./types";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

interface ActiveImage {
  name: string;
  url: string;
}

export default function App() {
  const [image, setImage] = useState<ActiveImage | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const [stepType, setStepType] = useState<PaintStepType>("Basecoat");
  const [matchTarget, setMatchTarget] = useState<MatchTarget | null>(null);
  const [showShopping, setShowShopping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const prevImageUrl = useRef<string | null>(null);

  const projects = useLiveQuery(() => listProjects(), [], [] as Project[]);
  const ownedList = useLiveQuery(() => listOwnedPaintIds(), [], [] as string[]);
  const ownedIds = useMemo(() => new Set(ownedList ?? []), [ownedList]);

  // Revoke stale object URLs when the active image changes.
  useEffect(() => {
    const prev = prevImageUrl.current;
    if (prev && prev.startsWith("blob:") && prev !== image?.url) URL.revokeObjectURL(prev);
    prevImageUrl.current = image?.url ?? null;
  }, [image]);

  const restoreImageFor = useCallback(async (p: Project) => {
    const name = p.imageName;
    if (!name) {
      setImage(null);
      return;
    }
    const local = LOCAL_IMAGES.find((i) => i.name === name);
    if (local) {
      setImage({ name, url: local.url });
      return;
    }
    const buf = await getImageBlob(name);
    if (buf) setImage({ name, url: URL.createObjectURL(new Blob([buf])) });
    else {
      setImage(null);
      setError(`Image "${name}" isn't stored — load it again.`);
    }
  }, []);

  const openProject = useCallback(
    async (p: Project | undefined | null, restore = true) => {
      setProject(p ?? null);
      setSelectedPinId(null);
      setMatchTarget(null);
      if (p && restore) await restoreImageFor(p);
      else if (!p) setImage(null);
    },
    [restoreImageFor]
  );

  useEffect(() => {
    (async () => {
      const existing = await listProjects();
      if (existing.length > 0) {
        await openProject(existing[0]);
      } else {
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

  // --- Image loading ---
  const openImage = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const buffer = await file.arrayBuffer();
        await saveImageBlob(file.name, buffer);
        setImage({ name: file.name, url: URL.createObjectURL(new Blob([buffer])) });
        setSelectedPinId(null);
        patchProject((p) => ({ ...p, imageName: file.name }));
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    },
    [patchProject]
  );

  const loadBuiltInImage = (name: string, url: string) => {
    setImage({ name, url });
    setSelectedPinId(null);
    patchProject((p) => ({ ...p, imageName: name }));
  };

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) void openImage(file);
      else if (file) setError("Please drop an image file (png, jpg, webp…).");
    },
    [openImage]
  );

  // --- Pins & recipes ---
  const addPin = (x: number, y: number) => {
    const id = uid();
    patchProject((p) => ({
      ...p,
      pins: [...p.pins, { id, x, y, label: `Pin ${p.pins.length + 1}` }],
    }));
    setSelectedPinId(id);
  };

  const renamePin = (id: string, label: string) =>
    patchProject((p) => ({
      ...p,
      pins: p.pins.map((pn) => (pn.id === id ? { ...pn, label } : pn)),
    }));

  const deletePin = (id: string) => {
    patchProject((p) => {
      const assignments = { ...p.assignments };
      delete assignments[id];
      return { ...p, pins: p.pins.filter((pn) => pn.id !== id), assignments };
    });
    setSelectedPinId((cur) => (cur === id ? null : cur));
  };

  const pickPaint = (paintId: string) => {
    if (!selectedPinId) return;
    patchProject((p) => ({
      ...p,
      assignments: {
        ...p.assignments,
        [selectedPinId]: [...(p.assignments[selectedPinId] ?? []), { type: stepType, paintId }],
      },
    }));
  };

  const removeStep = (pinId: string, index: number) =>
    patchProject((p) => ({
      ...p,
      assignments: {
        ...p.assignments,
        [pinId]: (p.assignments[pinId] ?? []).filter((_, i) => i !== index),
      },
    }));

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

  const matchColor = (hex: string) =>
    setMatchTarget({ hex, title: `Nearest to ${hex.toUpperCase()}` });

  // --- Project management ---
  const switchProject = async (id: string) => {
    const p = await getProject(id);
    if (p) await openProject(p);
  };

  const newProject = async () => {
    const name = window.prompt("New project name", "Untitled scheme");
    if (!name?.trim()) return;
    const p = createProject(name.trim());
    if (image) p.imageName = image.name;
    await saveProject(p);
    await openProject(p, false);
  };

  const renameProject = (name: string) => patchProject((p) => ({ ...p, name }));

  const deleteProject = async () => {
    if (!project) return;
    await dbDelete(project.id);
    const rest = await listProjects();
    await openProject(rest[0] ?? null);
  };

  const exportScheme = () => {
    if (!project) return;
    const blob = new Blob([JSON.stringify(toScheme(project), null, 2)], {
      type: "application/json",
    });
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
      await openProject(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const pins = project?.pins ?? [];
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
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
    >
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
          {LOCAL_IMAGES.length > 0 && (
            <select
              className="builtin-select"
              value=""
              onChange={(e) => {
                const im = LOCAL_IMAGES.find((li) => li.name === e.target.value);
                if (im) loadBuiltInImage(im.name, im.url);
                e.target.value = "";
              }}
              title="Load a saved image"
            >
              <option value="">Saved image…</option>
              {LOCAL_IMAGES.map((im) => (
                <option key={im.name} value={im.name}>
                  {im.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => imageInput.current?.click()}>Load image…</button>
          <input
            ref={imageInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void openImage(f);
              e.target.value = "";
            }}
          />
        </div>
      </header>

      {error && <div className="error">{error}</div>}

      <main>
        <section className="viewer">
          {image ? (
            <ImageAnnotator
              imageUrl={image.url}
              pins={pins}
              assignments={assignments}
              selectedPinId={selectedPinId}
              onAddPin={addPin}
              onSelectPin={setSelectedPinId}
            />
          ) : (
            <div className="empty-viewer">
              <p>Load a photo of your miniature to start planning.</p>
              <button onClick={() => imageInput.current?.click()}>Load image…</button>
              <p className="hint">…or drag &amp; drop an image anywhere.</p>
            </div>
          )}
          {dragging && <div className="drop-overlay">Drop an image (png / jpg / webp)</div>}
        </section>

        <aside className="sidebar">
          <PinPanel
            title={image?.name ?? "No image loaded"}
            pins={pins}
            assignments={assignments}
            selectedPinId={selectedPinId}
            onSelectPin={setSelectedPinId}
            onRenamePin={renamePin}
            onDeletePin={deletePin}
            onRemoveStep={removeStep}
          />

          <div className="step-picker">
            <span className="label">Add as:</span>
            {STEP_TYPES.map((t) => (
              <button
                key={t}
                className={t === stepType ? "active" : ""}
                onClick={() => setStepType(t)}
              >
                {t}
              </button>
            ))}
          </div>

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
            disabled={!selectedPinId}
            hint={selectedPinId ? undefined : "Add or select a pin to assign paint."}
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
