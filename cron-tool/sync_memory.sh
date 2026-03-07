#!/bin/bash
# Sync workspace memory files to GitHub
# Includes change detection and rebase error handling
# Uses GITHUB_TOKEN env var to avoid exposing secrets

cd /home/node/.openclaw/workspace

# Get token from env var (fail if not set)
if [ -z "$GITHUB_TOKEN" ]; then
    echo "[Sync] ❌ GITHUB_TOKEN environment variable not set!"
    exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/aa58771/openclaw-workspace.git"

# Set git user
git config --global user.name "Lobster Bot"
git config --global user.email "lobster@openclaw.ai"

# Initialize git if not already
if [ ! -d .git ]; then
    git init
    git remote add origin "$REPO_URL"
fi

# Pull with rebase and error handling
echo "[Sync] Pulling from origin..."
if ! git pull --rebase origin main; then
    echo "[Sync] ⚠️ Rebase failed, aborting..."
    git rebase --abort
    echo "[Sync] ❌ Aborted. Please check for conflicts manually."
    exit 1
fi

# Check if there are changes before committing (MEMORY.md, TOOLS.md, cron-tool/)
if git status --porcelain | grep -q '^.M\|^M\|^A'; then
    echo "[Sync] Changes detected, committing..."
    git add cron-tool/ MEMORY.md TOOLS.md
    git commit -m "Sync memory $(date '+%Y-%m-%d %H:%M')"
else
    echo "[Sync] No changes to commit."
fi

# Push to GitHub
echo "[Sync] Pushing to origin..."
git push -u origin main
echo "[Sync] ✅ Done!"
