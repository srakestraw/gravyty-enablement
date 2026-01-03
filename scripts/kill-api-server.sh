#!/bin/bash
# Kill any process running on port 4000 (API server)

set -e

PORT=4000

echo "🔍 Finding process on port $PORT..."

PID=$(lsof -ti:$PORT 2>/dev/null | head -1)

if [ -z "$PID" ]; then
    echo "✅ No process found on port $PORT"
    exit 0
fi

echo "Found process: $PID"
ps -p "$PID" -o pid,command 2>/dev/null || echo "Process details not available"
echo ""

read -p "Kill this process? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Cancelled."
    exit 0
fi

echo "Killing process $PID..."
kill -9 "$PID" 2>/dev/null || true

sleep 1

# Verify it's gone
if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "⚠️  Process still running, trying harder..."
    killall -9 node 2>/dev/null || true
    sleep 1
fi

if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "❌ Failed to kill process on port $PORT"
    exit 1
else
    echo "✅ Port $PORT is now free"
fi

