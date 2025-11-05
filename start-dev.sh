#!/bin/bash

# Shreeram General Store - Development Server Startup Script
# This script starts both the frontend (Vite) and API (PHP) servers

echo "🚀 Starting Shreeram General Store Development Environment..."
echo ""

# Check if PHP is available
if ! command -v php &> /dev/null; then
    echo "❌ PHP is not installed or not in PATH"
    echo "Please install PHP or add it to your PATH"
    exit 1
fi

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed or not in PATH"
    echo "Please install Node.js or add it to your PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    echo "Please install npm or add it to your PATH"
    exit 1
fi

echo "✅ All required tools are available"
echo ""

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

echo "🌐 Starting servers..."
echo "   Frontend: http://localhost:5174"
echo "   API: http://localhost:8000"
echo "   Admin: http://localhost:5174/admin"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Start both servers using npm script
npm run dev
