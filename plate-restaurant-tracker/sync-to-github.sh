#!/usr/bin/env bash
# Publish committed work from this standalone repo into the
# plate-restaurant-tracker/ subfolder of AneeshSingh22/Projects.
#
# This repo is standalone; GitHub holds it as a subtree inside a larger
# portfolio repo. Nothing here reaches GitHub until this runs.
#
# Usage: ./sync-to-github.sh
set -euo pipefail

PROJECTS_CLONE="c:/Users/Singh/projects/Projects"
PREFIX="plate-restaurant-tracker"

if [ -n "$(git status --porcelain)" ]; then
  echo "Working tree is dirty. Commit first, then sync." >&2
  exit 1
fi

cd "$PROJECTS_CLONE"
git checkout main
git pull --quiet origin main
git subtree pull --prefix="$PREFIX" plate main -m "Sync $PREFIX from local repo"
git push origin main
echo "Synced to https://github.com/AneeshSingh22/Projects/tree/main/$PREFIX"
