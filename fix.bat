@echo off
title Fix Git Main Branch - Rodent Inc.
echo.
echo =====================================================
echo     🐿️  SQUIRREL API STUDIO - GIT AUTO REPAIR TOOL
echo =====================================================
echo.

REM Make sure we are in a git repo
git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
    echo ❌ This folder is not a Git repository.
    echo Move this script into the project folder.
    pause
    exit /b
)

echo ✅ Aborting any stuck merges...
git merge --abort >nul 2>&1
git reset --merge >nul 2>&1

echo ✅ Removing corrupted remote tracking ref for origin/main...
if exist .git\refs\remotes\origin\main (
    del /F /Q .git\refs\remotes\origin\main
)

echo ✅ Pruning stale refs and fetching clean state...
git fetch --prune origin

echo ✅ Re-linking local main to origin/main...
git branch --set-upstream-to=origin/main main >nul 2>&1

echo.
echo ⚠️  If you had corrupted commits, we will now sync your branch.
echo.

echo ✅ Syncing local main to clean upstream...
git reset --hard origin/main

echo.
echo 🎉 DONE!
echo Your 'main' branch is now clean, synced, and stable.
echo.

git status

echo.
echo =====================================================
echo   🐿️  Rodent Inc. — Build Smart. Build Beautiful.
echo =====================================================
echo.
pause
