"use client";

import Editor, { type Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";
import type { editor } from "monaco-editor";

import {
  applyDiagnostics,
  LANGUAGE_ID,
  registerPseudocodeLanguage,
} from "@/lib/editor/pseudocode-language";
import { useStudioStore } from "@/store/studio-store";

export function MonacoEditor(): React.ReactElement {
  const source = useStudioStore((s) => s.source);
  const fontSize = useStudioStore((s) => s.fontSize);
  const wordWrap = useStudioStore((s) => s.wordWrap);
  const diagnostics = useStudioStore((s) => s.diagnostics);
  const currentLine = useStudioStore((s) => s.currentLine);
  const breakpoints = useStudioStore((s) => s.breakpoints);
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decoRef = useRef<string[]>([]);
  const breakRef = useRef<string[]>([]);

  const handleMount = (instance: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = instance;
    monacoRef.current = monaco;
    registerPseudocodeLanguage(monaco);
    monaco.editor.setTheme(resolvedTheme === "light" ? "pseudocode-light" : "pseudocode-dark");

    instance.onMouseDown((event) => {
      if (event.target.type !== monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) return;
      const line = event.target.position?.lineNumber;
      if (line) useStudioStore.getState().toggleBreakpoint(line);
    });
  };

  useEffect(() => {
    const monaco = monacoRef.current;
    const instance = editorRef.current;
    if (!monaco || !instance) return;
    monaco.editor.setTheme(resolvedTheme === "light" ? "pseudocode-light" : "pseudocode-dark");
  }, [resolvedTheme]);

  useEffect(() => {
    const monaco = monacoRef.current;
    const instance = editorRef.current;
    const model = instance?.getModel();
    if (!monaco || !model) return;
    applyDiagnostics(monaco, model, diagnostics);
  }, [diagnostics, source]);

  useEffect(() => {
    const instance = editorRef.current;
    const monaco = monacoRef.current;
    if (!instance || !monaco) return;
    decoRef.current = instance.deltaDecorations(
      decoRef.current,
      currentLine
        ? [
            {
              range: new monaco.Range(currentLine, 1, currentLine, 1),
              options: {
                isWholeLine: true,
                className: "pcs-current-line",
                glyphMarginClassName: "pcs-current-glyph",
              },
            },
          ]
        : [],
    );
    if (currentLine) {
      instance.revealLineInCenterIfOutsideViewport(currentLine);
    }
  }, [currentLine]);

  useEffect(() => {
    const instance = editorRef.current;
    const monaco = monacoRef.current;
    if (!instance || !monaco) return;
    breakRef.current = instance.deltaDecorations(
      breakRef.current,
      breakpoints.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: "pcs-breakpoint",
        },
      })),
    );
  }, [breakpoints]);

  return (
    <Editor
      language={LANGUAGE_ID}
      theme={resolvedTheme === "light" ? "pseudocode-light" : "pseudocode-dark"}
      value={source}
      onChange={(value) => useStudioStore.getState().setSource(value ?? "")}
      onMount={handleMount}
      options={{
        fontSize,
        fontFamily: "var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        minimap: { enabled: false },
        automaticLayout: true,
        glyphMargin: true,
        lineNumbers: "on",
        wordWrap: wordWrap ? "on" : "off",
        tabSize: 4,
        insertSpaces: true,
        renderLineHighlight: "all",
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        smoothScrolling: true,
      }}
    />
  );
}
