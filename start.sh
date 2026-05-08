#!/bin/bash
# ═══════════════════════════════════════════
# TeamFit AI — Local Development Startup
# ═══════════════════════════════════════════

set -e

echo ""
echo "  ████████╗███████╗ █████╗ ███╗   ███╗███████╗██╗████████╗"
echo "  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██╔════╝██║╚══██╔══╝"
echo "     ██║   █████╗  ███████║██╔████╔██║█████╗  ██║   ██║   "
echo "     ██║   ██╔══╝  ██╔══██║██║╚██╔╝██║██╔══╝  ██║   ██║   "
echo "     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║     ██║   ██║   "
echo "     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝     ╚═╝   ╚═╝   "
echo "                    AI-Powered Insights"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required. Install it first."
    exit 1
fi

# Check Node
if ! command -v npm &> /dev/null; then
    echo "❌ Node.js + npm is required. Install it first."
    exit 1
fi

# Install backend deps if needed
echo "📦 Setting up backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -q -r requirements.txt

# Copy env if not exists
if [ ! -f ".env" ]; then
    cp .env.example .env 2>/dev/null || true
    echo "⚠️  Created backend/.env — update JUDGE0_API_KEY if needed"
fi

# Start Flask
echo "📡 Starting backend on http://localhost:5000"
python app.py &
BACKEND_PID=$!
cd ..

# Install frontend deps if needed
echo "🎨 Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi

# Start Vite
echo "🖥️  Starting frontend on http://localhost:5173"
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "═══════════════════════════════════════════"
echo "  ✅ TeamFit AI is running!"
echo ""
echo "  🖥️  Frontend:  http://localhost:5173"
echo "  📡 Backend:   http://localhost:5000"
echo "  ❤️  Health:    http://localhost:5000/api/health"
echo ""
echo "  Demo Accounts:"
echo "  Student:    student@teamfit.ai / demo123"
echo "  Professor:  professor@teamfit.ai / demo123"
echo ""
echo "  Press Ctrl+C to stop both servers"
echo "═══════════════════════════════════════════"
echo ""

# Cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo ''; echo '👋 TeamFit AI stopped.'" EXIT
wait
