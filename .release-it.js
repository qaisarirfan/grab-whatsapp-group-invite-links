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
    // The origin remote uses an SSH host alias (github-qaisar.com, see
    // ~/.ssh/config) for multi-account auth. release-it derives the API host
    // from the remote URL and would otherwise treat that alias as a GitHub
    // Enterprise install, pointing requests at a nonexistent host.
    host: 'github.com',
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
        type: [
          {
            type: 'feat',
            section: 'Features',
          },
          {
            type: 'fix',
            section: 'Bug Fixes',
          },
          {
            type: 'perf',
            section: 'Performance Improvements',
          },
          {
            type: 'revert',
            section: 'Reverts',
          },
          {
            type: 'docs',
            section: 'Documentation',
          },
          {
            type: 'refactor',
            section: 'Code Refactoring',
          },
          {
            type: 'test',
            section: 'Tests',
          },
          {
            type: 'ci',
            section: 'Continuous Integration',
          },
        ],
      },
    },
  },
};
