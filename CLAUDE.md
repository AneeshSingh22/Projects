@AGENTS.md

## Finishing a phase

A phase is not done when it is committed. It is done when it is live.

1. `npm run build` and `npm run lint` both clean
2. Commit
3. **`./sync-to-github.sh`** — this repo is standalone; committing pushes nothing
4. Confirm the new build is serving at https://plate-restaurant-tracker.vercel.app
5. Append the phase entry to `DECISIONS.md`

Step 3 was missed for Phases 1 through 4, and the live site served stale code
for days as a result. Treat it as part of the build, not as an afterthought.
