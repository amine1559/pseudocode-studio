"use client";

import {
  BookOpen,
  Copy,
  Download,
  FilePlus,
  FolderOpen,
  Pencil,
  Settings,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EXAMPLE_ALGORITHMS } from "@/lib/algorithms/examples";
import { BLANK_ALGORITHM, EXERCISES } from "@/lib/algorithms/exercises";
import {
  createAlgorithmId,
  deleteAlgorithm,
  listAlgorithms,
  saveAlgorithm,
  type StoredAlgorithm,
} from "@/lib/storage/indexeddb";
import { cn } from "@/lib/utils";
import { useStudioStore, type SidebarView } from "@/store/studio-store";

const NAV: { id: SidebarView; label: string; icon: typeof FolderOpen }[] = [
  { id: "algorithms", label: "Mes algorithmes", icon: FolderOpen },
  { id: "examples", label: "Exemples", icon: BookOpen },
  { id: "exercises", label: "Exercices", icon: BookOpen },
  { id: "settings", label: "Paramètres", icon: Settings },
];

export function Sidebar(): React.ReactElement {
  const sidebar = useStudioStore((s) => s.sidebar);

  return (
    <div className="flex h-full min-h-0 bg-zinc-950">
      <nav className="flex w-12 flex-col items-center gap-1 border-r border-zinc-800 py-2">
        {NAV.map((item) => (
          <button
            key={item.id}
            title={item.label}
            className={cn(
              "flex size-9 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white",
              sidebar === item.id && "bg-zinc-800 text-cyan-300",
            )}
            onClick={() => useStudioStore.getState().setSidebar(item.id)}
          >
            <item.icon className="size-4" />
          </button>
        ))}
      </nav>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto p-3">
        <Button
          className="mb-3 w-full"
          size="sm"
          onClick={() => {
            useStudioStore.getState().setSidebar("algorithms");
            void createBlankAlgorithm();
          }}
        >
          <FilePlus className="size-4" />
          Nouvel algorithme
        </Button>
        {sidebar === "algorithms" && <AlgorithmsPanel />}
        {sidebar === "examples" && <ExamplesPanel />}
        {sidebar === "exercises" && <ExercisesPanel />}
        {sidebar === "settings" && <SettingsPanel />}
      </div>
    </div>
  );
}

async function createBlankAlgorithm(): Promise<void> {
  const id = createAlgorithmId();
  const algo: StoredAlgorithm = {
    id,
    name: "Nouvel algorithme",
    source: BLANK_ALGORITHM,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveAlgorithm(algo);
  useStudioStore.getState().setAlgorithms(await listAlgorithms());
  useStudioStore.getState().loadDocument(id, algo.name, algo.source);
}

function AlgorithmsPanel(): React.ReactElement {
  const algorithms = useStudioStore((s) => s.algorithms);
  const currentId = useStudioStore((s) => s.currentId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const persistList = async () => {
    useStudioStore.getState().setAlgorithms(await listAlgorithms());
  };

  const createNew = () => createBlankAlgorithm();

  const duplicate = async (item: StoredAlgorithm) => {
    const copy: StoredAlgorithm = {
      ...item,
      id: createAlgorithmId(),
      name: `${item.name} (copie)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveAlgorithm(copy);
    await persistList();
  };

  const remove = async (item: StoredAlgorithm) => {
    await deleteAlgorithm(item.id);
    await persistList();
    if (useStudioStore.getState().currentId === item.id) {
      useStudioStore.getState().loadDocument(null, "Sans titre", BLANK_ALGORITHM);
    }
  };

  const importFile = async (file: File) => {
    const source = await file.text();
    const name = file.name.replace(/\.(algo|txt)$/i, "");
    const id = createAlgorithmId();
    const algo: StoredAlgorithm = {
      id,
      name,
      source,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveAlgorithm(algo);
    await persistList();
    useStudioStore.getState().loadDocument(id, name, source);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Mes algorithmes</h2>
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" title="Nouvel algorithme" onClick={() => void createNew()}>
            <FilePlus className="size-4" />
          </Button>
          <Button size="icon" variant="ghost" title="Importer" onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" />
          </Button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept=".algo,.txt,text/plain"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
          event.target.value = "";
        }}
      />
      {algorithms.length === 0 ? (
        <p className="text-xs text-zinc-500">Aucun algorithme enregistré. Créez-en un pour commencer.</p>
      ) : (
        <ul className="space-y-1">
          {algorithms.map((item) => (
            <li
              key={item.id}
              className={cn(
                "group rounded-md border border-transparent px-2 py-1.5 hover:border-zinc-700 hover:bg-zinc-900",
                currentId === item.id && "border-cyan-900 bg-cyan-950/40",
              )}
            >
              <button
                className="block w-full truncate text-left text-sm text-zinc-200"
                onClick={() => useStudioStore.getState().loadDocument(item.id, item.name, item.source)}
              >
                {item.name}
              </button>
              <div className="mt-1 hidden gap-1 group-hover:flex">
                <IconAction
                  title="Renommer"
                  onClick={() => {
                    setRenameId(item.id);
                    setRenameValue(item.name);
                  }}
                >
                  <Pencil className="size-3.5" />
                </IconAction>
                <IconAction title="Dupliquer" onClick={() => void duplicate(item)}>
                  <Copy className="size-3.5" />
                </IconAction>
                <IconAction title="Supprimer" onClick={() => void remove(item)}>
                  <Trash2 className="size-3.5" />
                </IconAction>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={renameId !== null} onOpenChange={(open) => !open && setRenameId(null)}>
        <DialogContent title="Renommer l'algorithme">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              const item = algorithms.find((algo) => algo.id === renameId);
              if (!item) return;
              void saveAlgorithm({ ...item, name: renameValue, updatedAt: Date.now() }).then(async () => {
                await persistList();
                if (useStudioStore.getState().currentId === item.id) {
                  useStudioStore.getState().setCurrentName(renameValue);
                  useStudioStore.getState().setDirty(true);
                }
                setRenameId(null);
              });
            }}
          >
            <Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
            <Button type="submit" className="w-full">
              Enregistrer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExamplesPanel(): React.ReactElement {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Exemples</h2>
      <ul className="space-y-1">
        {EXAMPLE_ALGORITHMS.map((example, index) => (
          <li key={example.id}>
            <button
              className="w-full rounded-md px-2 py-1.5 text-left hover:bg-zinc-900"
              onClick={() => useStudioStore.getState().loadDocument(null, example.title, example.source)}
            >
              <div className="text-sm text-zinc-100">
                {index + 1}. {example.title}
              </div>
              <div className="text-[11px] text-zinc-500">{example.description}</div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ExercisesPanel(): React.ReactElement {
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Exercices</h2>
      <ul className="space-y-2">
        {EXERCISES.map((exercise) => (
          <li key={exercise.id} className="rounded-md border border-zinc-800 p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm text-zinc-100">{exercise.title}</span>
              <span className="text-[10px] uppercase text-cyan-400">{exercise.difficulty}</span>
            </div>
            <p className="mt-1 text-[11px] text-zinc-500">{exercise.statement}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => useStudioStore.getState().loadDocument(null, exercise.title, exercise.starter)}
            >
              Ouvrir
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SettingsPanel(): React.ReactElement {
  const fontSize = useStudioStore((s) => s.fontSize);
  const wordWrap = useStudioStore((s) => s.wordWrap);

  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Paramètres</h2>
      <label className="block text-sm text-zinc-300">
        Taille de police
        <input
          type="range"
          min={12}
          max={22}
          value={fontSize}
          className="mt-2 w-full"
          onChange={(event) => useStudioStore.getState().setFontSize(Number(event.target.value))}
        />
        <span className="text-xs text-zinc-500">{fontSize}px</span>
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input
          type="checkbox"
          checked={wordWrap}
          onChange={(event) => useStudioStore.getState().setWordWrap(event.target.checked)}
        />
        Retour à la ligne automatique
      </label>
      <p className="text-xs leading-5 text-zinc-500">
        Les algorithmes sont enregistrés localement dans votre navigateur (IndexedDB). Aucun compte n&apos;est
        nécessaire.
      </p>
    </div>
  );
}

function IconAction({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <button title={title} className="rounded p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white" onClick={onClick}>
      {children}
    </button>
  );
}

export function downloadSource(name: string, source: string, extension: "algo" | "txt"): void {
  const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}.${extension}`;
  link.click();
  URL.revokeObjectURL(url);
}

export function DownloadButton(): React.ReactElement {
  const source = useStudioStore((s) => s.source);
  const name = useStudioStore((s) => s.currentName);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => downloadSource(name || "algorithme", source, "algo")}
    >
      <Download className="size-4" />
      Télécharger
    </Button>
  );
}
