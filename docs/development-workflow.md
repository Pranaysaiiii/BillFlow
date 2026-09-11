# Development Workflow

This repository is structured for small, parallel team work. The main branch must always remain runnable.

## Required workflow

1. Never directly push unfinished work to main.
2. Create a feature branch before starting work.
3. Make small, reviewable commits.
4. Push the branch to GitHub.
5. Open a Pull Request.
6. Merge only working code.
7. Pull the latest main before starting new work.
8. Resolve conflicts immediately.
9. Do not change shared interfaces without notifying the team.

## Branches

- main
- feature/mobile
- feature/backend-ai
- feature/web

## Recommended commit naming

- feat: add invoice list
- feat: add ai extraction
- feat: add customer memory
- fix: handle missing gstin
- fix: handle invoice calculation

## Team collaboration rules

### RULE 1
Do not change shared types casually.

### RULE 2
Do not rename database fields without telling the team.

### RULE 3
Do not hardcode production API keys.

### RULE 4
Do not put business logic only inside UI components.

### RULE 5
LLM output must use structured JSON.

### RULE 6
GST calculations must be deterministic.

### RULE 7
The mobile app and web app must use the same Supabase database.

### RULE 8
Keep the MVP small.

### RULE 9
No major architectural changes after the first working end-to-end flow.

### RULE 10
If a feature is not required for the demo, put it in a TODO/parking lot instead of building it.

## Pull request discipline

- Keep scope narrow.
- Avoid mixing refactors and feature work in one PR.
- Write commits that explain the intent of the change.
- Ensure the branch is tested or manually reviewed before merging.

## Conflict handling

- Pull recent changes before continuing work.
- Resolve merge conflicts as soon as they appear.
- Keep interfaces stable so front-end and backend code can merge without churn.
