#!/bin/bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "Backend started with PID: $BACKEND_PID"

sleep 3

npm run dev:express

kill $BACKEND_PID 2>/dev/null
