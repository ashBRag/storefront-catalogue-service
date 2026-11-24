import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards the UI boundary (frontend/CLAUDE.md): styling lives only in src/ui, and
// everything else uses src/ui through its index. This keeps the look and feel swappable.

const SRC = join(import.meta.dirname, '..', 'src');
const UI = join(SRC, 'ui');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry): string[] => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const outsideUi = sourceFiles(SRC).filter((file) => !file.startsWith(UI));
// main.tsx loads the global stylesheets from src/ui; that is its one styling job.
const ENTRY = join(SRC, 'main.tsx');

describe('UI boundary', () => {
  it.each(outsideUi.filter((file) => file !== ENTRY).map((file) => [relative(SRC, file), file]))(
    '%s has no styling',
    (_name, file) => {
      const code = readFileSync(file, 'utf8');
      expect(code).not.toMatch(/className=|style=\{|\.css['"]/);
    },
  );

  it.each(outsideUi.map((file) => [relative(SRC, file), file]))('%s imports src/ui only via its index', (_name, file) => {
    const code = readFileSync(file, 'utf8');
    const uiImports = [...code.matchAll(/from '([^']*\/ui\/[^']*)'/g)].map((match) => match[1]);
    expect(uiImports.filter((path) => !path?.endsWith('/ui/index.ts'))).toEqual([]);
  });
});
