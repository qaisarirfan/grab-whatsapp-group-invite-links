import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const manifestPath = path.resolve(__dirname, '../public/manifest.json');
const packageJsonPath = path.resolve(__dirname, '../package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Chrome requires 1-4 dot-separated non-negative integers, no pre-release suffix.
const manifestVersion = version.split('-')[0];

const manifestSource = fs.readFileSync(manifestPath, 'utf8');
const versionLine = /^(\s*"version":\s*")[^"]+(")/m;

if (!versionLine.test(manifestSource)) {
  throw new Error(`Could not find a "version" field in ${manifestPath}`);
}

// Replace only the version value in place (rather than JSON.parse +
// JSON.stringify) so the file's hand-maintained formatting — blank lines
// between sections, single-line arrays — survives every release.
const updatedManifest = manifestSource.replace(versionLine, `$1${manifestVersion}$2`);
fs.writeFileSync(manifestPath, updatedManifest);

console.log(`Synced public/manifest.json version to ${manifestVersion}`);
