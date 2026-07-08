require("dotenv")
const { execSync } = require('child_process');

// release-it's GitHub plugin reads GITHUB_TOKEN from the environment. Fall
// back to the token from an authenticated `gh` CLI so releases work locally
// without exporting the variable by hand.
if (!process.env.GITHUB_TOKEN) {
  try {
    process.env.GITHUB_TOKEN = execSync('gh auth token', {
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
  } catch {
    // gh CLI not installed/authenticated — release-it will report a clear
    // "missing token" error if a GitHub release is actually attempted.
  }
}

module.exports = {
  git: {
    commitMessage: 'chore(release): v${version}',
    tagName: 'v${version}',
    tagAnnotation: 'Release v${version}',
    requireCleanWorkingDir: true,
    requireBranch: 'master',
    requireUpstream: true,
    push: true,
    pushArgs: ['--follow-tags'],
  },
  npm: {
    publish: false,
  },
  github: {
    release: true,
    releaseName: 'v${version}',
    assets: ['grab-whatsapp-group-invite-links.zip'],
  },
  hooks: {
    'before:init': ['npm run lint', 'npm run typecheck'],
    'after:bump': 'node ./scripts/sync-manifest-version.mjs && git add public/manifest.json',
    'before:release': 'npm run build',
  },
  plugins: {
    '@release-it/conventional-changelog': {
      infile: 'CHANGELOG.md',
      header: '# Changelog',
      preset: {
        name: 'conventionalcommits',
        types: [
          { type: 'feat', section: 'Features' },
          { type: 'fix', section: 'Bug Fixes' },
          { type: 'perf', section: 'Performance' },
          { type: 'refactor', section: 'Refactoring' },
          { type: 'docs', section: 'Documentation' },
          { type: 'chore', hidden: true },
          { type: 'style', hidden: true },
          { type: 'test', hidden: true },
          { type: 'build', hidden: true },
          { type: 'ci', hidden: true },
        ],
      },
    },
  },
};
