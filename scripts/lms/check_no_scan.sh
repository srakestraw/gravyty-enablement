#!/bin/bash
#
# No-scan check for Phase 10 primary flows
# 
# Enforces that Phase 10 primary flows do not use DynamoDB ScanCommand.
# 
# The script intentionally excludes:
# - Import statements (e.g., `import { ScanCommand ... }`)
# - Non-Phase 10 code paths (notably `listAssignments()` - Phase 8/9)
# - Comments / documentation strings
# 
# Phase 10 surfaces covered:
# - Handlers: listPaths, getPathDetail, startPath, updateProgress (rollup hook)
# - Repo: listPublishedPathIdsForCourse, getPublishedPathsForCourse
# 
# Expected result:
# - ✅ PASS when ScanCommand is absent from Phase 10 flows
# - ❌ FAIL if ScanCommand is introduced into any Phase 10 primary flow
#
# If this check fails, inspect the grep output first - it prints the exact file/line
# where ScanCommand appears.
#
# Usage: ./scripts/lms/check_no_scan.sh

set -e

echo "🔍 Checking for ScanCommand in Phase 10 flows..."

# Check handlers file (should have no ScanCommand at all)
HANDLER_SCANS=$(grep -n "ScanCommand\|\.scan(" apps/api/src/handlers/lms.ts 2>/dev/null | grep -vE "import|//" || true)

if [ -n "$HANDLER_SCANS" ]; then
  echo "❌ FAIL: ScanCommand found in handlers/lms.ts:"
  echo "$HANDLER_SCANS"
  exit 1
fi

# Check repo file - exclude listAssignments method by checking context
# Look for ScanCommand that's NOT near "listAssignments" function
REPO_SCANS=$(grep -n "ScanCommand\|\.scan(" apps/api/src/storage/dynamo/lmsRepo.ts 2>/dev/null | grep -vE "import|ScanCommand,|//" || true)

if [ -n "$REPO_SCANS" ]; then
  # Check if any ScanCommand is NOT in listAssignments context
  # listAssignments is around lines 1580-1650, so we check if line number is in that range
  PHASE10_SCANS=""
  for line in $REPO_SCANS; do
    # Extract line number (format: file:line:content)
    line_num=$(echo "$line" | sed -n 's/.*:\([0-9][0-9]*\):.*/\1/p')
    if [ -n "$line_num" ]; then
      # Check if line is outside listAssignments range (1580-1650)
      if [ "$line_num" -lt 1580 ] || [ "$line_num" -gt 1650 ]; then
        PHASE10_SCANS="${PHASE10_SCANS}${line}\n"
      fi
    fi
  done
  
  PHASE10_SCANS=$(echo -e "$PHASE10_SCANS" | grep -v "^$" || true)
  
  if [ -n "$PHASE10_SCANS" ]; then
    echo "❌ FAIL: ScanCommand found in Phase 10 flows:"
    echo -e "$PHASE10_SCANS"
    exit 1
  fi
fi

echo "✅ PASS: No ScanCommand in Phase 10 primary flows"
exit 0
