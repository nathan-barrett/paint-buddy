import { useRef } from "react";
import type { Project } from "../types";

interface Props {
  projects: Project[];
  currentId: string | null;
  onSwitch: (id: string) => void;
  onNew: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
}

export default function ProjectBar({
  projects,
  currentId,
  onSwitch,
  onNew,
  onRename,
  onDelete,
  onExport,
  onImport,
}: Props) {
  const importInput = useRef<HTMLInputElement>(null);
  const current = projects.find((p) => p.id === currentId);

  return (
    <div className="project-bar">
      <select
        value={currentId ?? ""}
        onChange={(e) => onSwitch(e.target.value)}
        title="Switch project"
      >
        {projects.length === 0 && <option value="">No projects</option>}
        {projects.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <button onClick={onNew} title="New project">＋ New</button>
      <button
        disabled={!current}
        onClick={() => {
          const name = window.prompt("Rename project", current?.name ?? "");
          if (name && name.trim()) onRename(name.trim());
        }}
        title="Rename project"
      >
        Rename
      </button>
      <button
        disabled={!current || projects.length <= 1}
        onClick={() => {
          if (current && window.confirm(`Delete “${current.name}”?`)) onDelete();
        }}
        title="Delete project"
      >
        Delete
      </button>
      <button disabled={!current} onClick={onExport} title="Export scheme as JSON">
        Export
      </button>
      <button onClick={() => importInput.current?.click()} title="Import scheme JSON">
        Import
      </button>
      <input
        ref={importInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onImport(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
