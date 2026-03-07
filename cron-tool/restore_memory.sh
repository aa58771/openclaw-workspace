#!/bin/bash
# Memory Restore Script
# Run before scheduler to restore MEMORY.md and TOOLS.md from GitHub
# Uses git init + fetch + reset (not clone) with retry logic

WORKSPACE_DIR="/home/node/.openclaw/workspace"

# Get token from env var (fallback to empty if not set, will fail gracefully)
GITHUB_TOKEN="${GITHUB_TOKEN:-}"
if [ -z "$GITHUB_TOKEN" ]; then
    echo "[Memory Restore] ⚠️ GITHUB_TOKEN not set, cannot restore from GitHub"
    exit 1
fi

REPO_URL="https://${GITHUB_TOKEN}@github.com/aa58771/openclaw-workspace.git"

echo "[Memory Restore] Checking workspace at $WORKSPACE_DIR..."

cd "$WORKSPACE_DIR"

# Set git config (must set before any git operations)
git config --global user.name "Lobster Bot"
git config --global user.email "lobster@openclaw.ai"

# Check if .git exists
if [ ! -d ".git" ]; then
  echo "[Memory Restore] No .git found, initializing..."
  git init
  git remote add origin "$REPO_URL"
fi

# Retry loop: keep trying until git fetch succeeds
MAX_RETRIES=999
RETRY_DELAY=5
retry_count=0

while [ $retry_count -lt $MAX_RETRIES ]; do
  echo "[Memory Restore] Fetching from origin (attempt $((retry_count+1)))..."
  
  if git fetch origin 2>/dev/null; then
    echo "[Memory Restore] ✅ Fetch successful!"
    break
  else
    retry_count=$((retry_count + 1))
    echo "[Memory Restore] ⚠️ Fetch failed, retrying in ${RETRY_DELAY}s..."
    sleep $RETRY_DELAY
  fi
done

if [ $retry_count -eq $MAX_RETRIES ]; then
  echo "[Memory Restore] ❌ Failed after $MAX_RETRIES attempts, cannot continue!"
  exit 1
fi

# Hard reset ONLY after confirmed fetch success
echo "[Memory Restore] Hard reset to origin/main..."
git reset --hard origin/main

# Verify restore
if [ -f "$WORKSPACE_DIR/MEMORY.md" ] && [ -f "$WORKSPACE_DIR/TOOLS.md" ]; then
  echo "[Memory Restore] ✅ Success! Memory restored from GitHub"
  echo "[Memory Restore] Files verified: MEMORY.md, TOOLS.md"
else
  echo "[Memory Restore] ⚠️ Warning: Files may be missing after reset"
  ls -la "$WORKSPACE_DIR"/*.md
fi
