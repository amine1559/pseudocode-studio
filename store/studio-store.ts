"use client";

import { create } from "zustand";

import { ACCEPTANCE_ALGORITHM } from "@/lib/algorithms/exercises";
import type { Diagnostic } from "@/types/diagnostics";
import type {
  CallFrameSnapshot,
  DebugSnapshot,
  HistoryEntry,
  InputRequest,
  LoopCounter,
  VariableSnapshot,
} from "@/types/runtime";
import type { StoredAlgorithm } from "@/lib/storage/indexeddb";

export type SidebarView = "algorithms" | "examples" | "exercises" | "settings";
export type ExecutionStatus = "idle" | "running" | "paused" | "waiting-input" | "finished" | "error";

export interface ConsoleLine {
  id: string;
  kind: "system" | "output" | "input" | "error" | "success";
  text: string;
}

interface StudioState {
  source: string;
  currentName: string;
  currentId: string | null;
  dirty: boolean;
  algorithms: StoredAlgorithm[];
  sidebar: SidebarView;
  fontSize: number;
  wordWrap: boolean;
  status: ExecutionStatus;
  currentLine: number | null;
  breakpoints: number[];
  consoleLines: ConsoleLine[];
  inputRequest: InputRequest | null;
  variables: VariableSnapshot[];
  callStack: CallFrameSnapshot[];
  history: HistoryEntry[];
  loops: LoopCounter[];
  diagnostics: Diagnostic[];
  step: number;
}

interface StudioActions {
  setSource: (source: string) => void;
  setCurrentName: (name: string) => void;
  setCurrentId: (id: string | null) => void;
  setDirty: (dirty: boolean) => void;
  setAlgorithms: (algorithms: StoredAlgorithm[]) => void;
  setSidebar: (sidebar: SidebarView) => void;
  setFontSize: (fontSize: number) => void;
  setWordWrap: (wordWrap: boolean) => void;
  setStatus: (status: ExecutionStatus) => void;
  setCurrentLine: (line: number | null) => void;
  toggleBreakpoint: (line: number) => void;
  setBreakpoints: (lines: number[]) => void;
  appendConsole: (line: Omit<ConsoleLine, "id">) => void;
  clearConsole: () => void;
  setInputRequest: (request: InputRequest | null) => void;
  applySnapshot: (snapshot: DebugSnapshot) => void;
  setDiagnostics: (diagnostics: Diagnostic[]) => void;
  resetExecution: () => void;
  loadDocument: (id: string | null, name: string, source: string) => void;
}

let consoleSeq = 0;

export const useStudioStore = create<StudioState & StudioActions>((set) => ({
  source: ACCEPTANCE_ALGORITHM,
  currentName: "CalculMoyenne",
  currentId: null,
  dirty: true,
  algorithms: [],
  sidebar: "examples",
  fontSize: 15,
  wordWrap: false,
  status: "idle",
  currentLine: null,
  breakpoints: [],
  consoleLines: [
    {
      id: "welcome",
      kind: "system",
      text: "PseudoCode Studio — interpréteur de pseudo-code français. Cliquez sur Exécuter pour démarrer.",
    },
  ],
  inputRequest: null,
  variables: [],
  callStack: [],
  history: [],
  loops: [],
  diagnostics: [],
  step: 0,

  setSource: (source) => set({ source, dirty: true }),
  setCurrentName: (currentName) => set({ currentName, dirty: true }),
  setCurrentId: (currentId) => set({ currentId }),
  setDirty: (dirty) => set({ dirty }),
  setAlgorithms: (algorithms) => set({ algorithms }),
  setSidebar: (sidebar) => set({ sidebar }),
  setFontSize: (fontSize) => set({ fontSize }),
  setWordWrap: (wordWrap) => set({ wordWrap }),
  setStatus: (status) => set({ status }),
  setCurrentLine: (currentLine) => set({ currentLine }),
  toggleBreakpoint: (line) =>
    set((state) => ({
      breakpoints: state.breakpoints.includes(line)
        ? state.breakpoints.filter((item) => item !== line)
        : [...state.breakpoints, line].sort((a, b) => a - b),
    })),
  setBreakpoints: (breakpoints) => set({ breakpoints }),
  appendConsole: (line) =>
    set((state) => ({
      consoleLines: [...state.consoleLines, { ...line, id: `c-${(consoleSeq += 1)}` }].slice(-500),
    })),
  clearConsole: () => set({ consoleLines: [] }),
  setInputRequest: (inputRequest) => set({ inputRequest }),
  applySnapshot: (snapshot) =>
    set({
      currentLine: snapshot.line,
      variables: snapshot.variables,
      callStack: snapshot.callStack,
      history: snapshot.history,
      loops: snapshot.loops,
      step: snapshot.step,
    }),
  setDiagnostics: (diagnostics) => set({ diagnostics }),
  resetExecution: () =>
    set({
      status: "idle",
      currentLine: null,
      inputRequest: null,
      variables: [],
      callStack: [],
      history: [],
      loops: [],
      step: 0,
    }),
  loadDocument: (id, name, source) =>
    set({
      currentId: id,
      currentName: name,
      source,
      dirty: false,
      status: "idle",
      currentLine: null,
      inputRequest: null,
    }),
}));
