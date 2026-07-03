---
name: staged-commit-pr
description: Use when generating a git commit message or GitHub PR description scoped strictly to staged changes — runs `git diff --staged` to inspect only what is indexed, ignores unstaged edits and untracked files, and produces conventional-commit messages and structured PR bodies. Trigger phrases include "commit staged", "write commit for staged", "PR description for staged changes", "commit only what's staged".
---

# Staged Commit & PR Description

## Critical Guidelines

- You MUST source every claim in the commit message or PR description from `git diff --staged` output only.
- You MUST NOT include unstaged edits (`git diff`) or untracked files (`git status`) in the description unless the user explicitly adds them to the index first.
- You MUST verify the staged set is non-empty before generating any message; if empty, stop and tell the user.

## How to Use

### Step 1 — Inspect staged changes

```bash
git diff --staged --stat          # high-level file summary
git diff --staged                 # full diff for content analysis
```

Do not run `git diff` (unstaged) or `git status -uall` at this point.

### Step 2 — Classify the change

Determine the conventional-commit type from staged content:

| Type       | When to use                                    |
| ---------- | ---------------------------------------------- |
| `feat`     | New feature or capability added                |
| `fix`      | Bug fix                                        |
| `refactor` | Code restructure, no behaviour change          |
| `chore`    | Build scripts, deps, config, non-src files     |
| `docs`     | Documentation only                             |
| `test`     | Tests added or updated                         |
| `style`    | Formatting, whitespace, lint (no logic change) |
| `perf`     | Performance improvement                        |

### Step 3 — Write the commit message

Format:

```
<type>(<optional-scope>): <imperative summary, ≤72 chars>

<optional body — explain WHY, not WHAT; wrap at 72 chars>

Co-Authored-By: <agent name, only if the user/project wants attribution>
```

Rules:

- Summary is imperative mood ("add", "fix", "remove" — not "added", "fixes")
- Scope is the module or domain affected (e.g. `popup`, `validation`, `webpack`, `docs`)
- Body is optional; include it when motivation is non-obvious from the diff

### Step 4 — Stage the commit (only if the user asks)

```bash
git commit -m "$(cat <<'EOF'
<message here>
EOF
)"
```

Never run `git add .` or `git add -A` — commit only what is already staged.

### Step 5 — Write the PR description (if requested)

Use this template, populated from staged diff only:

```markdown
## Summary

- <bullet 1 — key change>
- <bullet 2>
- <bullet 3>

## Changed files

| File           | Change            |
| -------------- | ----------------- |
| `path/to/file` | Brief description |

## Test plan

- [ ] <manual or automated check>
- [ ] <edge case to verify>
```

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Including unstaged edits in the message | Re-read `git diff --staged`; unstaged = not your scope |
| Using past tense ("added X") | Use imperative ("add X") |
| Vague summary ("update files") | Name the specific thing changed ("add 24-hour cache to link validation") |
| Generating PR description when no PR branch exists | Ask user to push branch first |
| Running `git add` before committing | User stages their own files; never auto-stage |

## Examples

### Commit message — chore files only staged

```
git diff --staged --stat
# doc/overview.md      | 195 ++
# plan/improvements.md | 152 ++
# package.json         |   4 +-
```

Generated message:

```
chore(docs): add project overview and improvement plan, bump build deps

Adds product/architecture framing docs and a prioritised list of bug fixes
and clean-ups identified during code review, plus a minor dependency bump.
```

### PR description — feature branch

If staged diff shows new validation logic wired into the popup UI:

```markdown
## Summary

- Add `validateMultipleLinks` link-health check with 24-hour `chrome.storage.local` caching
- Show Active/Expired/Invalid/Limited status badges in the links table

## Changed files

| File                          | Change                                    |
| ----------------------------- | ------------------------------------------ |
| `src/validation.ts`           | New link validation logic + storage cache |
| `src/components/Links.tsx`    | Render status badges and last-checked time |
| `src/components/Actions.tsx`  | Add "Validate links" button               |

## Test plan

- [ ] Extract links, click "Validate links", confirm badges appear
- [ ] Re-open the popup within 24h and confirm cached results load without re-fetching
- [ ] Confirm an unreachable link is marked Expired/Invalid rather than crashing
```
