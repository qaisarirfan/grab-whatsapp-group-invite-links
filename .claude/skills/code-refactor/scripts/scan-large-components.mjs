#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const includeDirs = ['src'];
const excludedDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'dist-dev',
  'src/components/ui', // shadcn-generated primitives, excluded from tsconfig typecheck too
]);

const lineThreshold = Number(process.env.LINE_THRESHOLD || 250);
const maxResults = Number(process.env.MAX_RESULTS || 40);

const concernPatterns = [
  ['state', /\buse(State|Reducer)\b/g],
  ['effects', /\buseEffect\b/g],
  ['memo', /\buse(Memo|Callback|Ref)\b/g],
  ['chrome-api', /\bchrome\.(scripting|storage|sidePanel|tabs|runtime|contextMenus)\b/g],
  ['fetch', /\b(axios|fetchData|extractWhatsappLinks|cheerio)\b/g],
  ['validation', /\b(validateLink|validateMultipleLinks|validationLimiter)\b/g],
  ['analytics', /\b(fireEvent|firePageViewEvent|fireErrorEvent|Analytics)\b/g],
  ['clipboard/csv', /\b(copyToClipboard|convertToCsv|navigator\.clipboard)\b/g],
  ['mapping', /\.map\(/g],
  ['conditionals', /\b(if|switch)\b|\?/g],
];

const componentPattern = /\bexport\s+(default\s+)?function\s+[A-Z][A-Za-z0-9]*|\bconst\s+[A-Z][A-Za-z0-9]*\s*[:=]/;

function shouldSkipDirectory(directoryPath) {
  const relativePath = path.relative(root, directoryPath);

  if (!relativePath) {
    return false;
  }

  return relativePath
    .split(path.sep)
    .some((part, index, parts) => excludedDirs.has(part) || excludedDirs.has(parts.slice(0, index + 1).join('/')));
}

function listFiles(directoryPath) {
  if (shouldSkipDirectory(directoryPath)) {
    return [];
  }

  return readdirSync(directoryPath).flatMap((entry) => {
    const entryPath = path.join(directoryPath, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      return listFiles(entryPath);
    }

    if (!/\.(tsx|ts)$/.test(entry) || /\.d\.ts$/.test(entry)) {
      return [];
    }

    return [entryPath];
  });
}

function countMatches(source, pattern) {
  return [...source.matchAll(pattern)].length;
}

function analyzeFile(filePath) {
  const source = readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);
  const jsxCount = countMatches(source, /<([A-Z][A-Za-z0-9]*|[a-z][a-z0-9-]*)[\s>/]/g);
  const handlerCount = countMatches(source, /\b(handle[A-Z][A-Za-z0-9]*|on[A-Z][A-Za-z0-9]*)\b/g);
  const localFunctionCount = countMatches(source, /\b(function|const)\s+[a-zA-Z][A-Za-z0-9]*\s*(=|\()/g);
  const concerns = concernPatterns.map(([name, pattern]) => [name, countMatches(source, pattern)]).filter(([, count]) => count > 0);
  const concernScore = concerns.length;
  const isLikelyComponent = filePath.endsWith('.tsx') && (componentPattern.test(source) || jsxCount > 10);
  // Flat src/*.ts utility files (utils.ts, validation.ts, analytics.ts) are
  // valid candidates too, but only once they mix multiple concerns.
  const isLikelyModule = filePath.endsWith('.ts') && concernScore >= 3;
  const isCandidate = isLikelyComponent || isLikelyModule;
  const score = lines.length + jsxCount * 2 + handlerCount * 5 + localFunctionCount * 6 + concernScore * 30;

  const reasons = [];

  if (lines.length >= lineThreshold) {
    reasons.push(`${lines.length} lines`);
  }

  if (concernScore >= 4) {
    reasons.push(`${concernScore} concerns`);
  }

  if (handlerCount >= 8) {
    reasons.push(`${handlerCount} handlers`);
  }

  if (jsxCount >= 80) {
    reasons.push(`${jsxCount} JSX tags`);
  }

  if (localFunctionCount >= 10) {
    reasons.push(`${localFunctionCount} local functions`);
  }

  return {
    filePath,
    relativePath: path.relative(root, filePath),
    lines: lines.length,
    jsxCount,
    handlerCount,
    localFunctionCount,
    concerns,
    concernScore,
    isCandidate,
    reasons,
    score,
  };
}

const candidates = includeDirs
  .flatMap((directory) => {
    const directoryPath = path.join(root, directory);

    try {
      return statSync(directoryPath).isDirectory() ? listFiles(directoryPath) : [];
    } catch {
      return [];
    }
  })
  .map(analyzeFile)
  .filter((result) => result.isCandidate)
  .filter((result) => result.reasons.length > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, maxResults);

if (candidates.length === 0) {
  console.log(`No large component/module candidates found with LINE_THRESHOLD=${lineThreshold}.`);
  process.exit(0);
}

console.log(`Large component/module refactor candidates (LINE_THRESHOLD=${lineThreshold})`);
console.log('');
console.log('| File | Lines | Signals | Concerns |');
console.log('| --- | ---: | --- | --- |');

for (const candidate of candidates) {
  const concerns = candidate.concerns.map(([name, count]) => `${name}:${count}`).join(', ');

  console.log(`| ${candidate.relativePath} | ${candidate.lines} | ${candidate.reasons.join(', ')} | ${concerns} |`);
}
