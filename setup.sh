#!/bin/bash

echo "🚀 Local LLM Memory System - Quick Setup"
echo "========================================"
echo ""

# Check if Podman is installed
if ! command -v podman &> /dev/null; then
    echo "❌ Podman is not installed. Please install Podman first:"
    echo "   https://podman.io/getting-started/installation"
    exit 1
fi

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed. Please install Ollama first:"
    echo "   https://ollama.ai"
    exit 1
fi

echo "✅ Podman found"
echo "✅ Ollama found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Start Qdrant
echo ""
echo "🗄️  Starting Qdrant vector database..."
podman-compose up -d

# Wait for Qdrant to be ready
echo "⏳ Waiting for Qdrant to be ready..."
sleep 3

# Pull Ollama models
echo ""
echo "🤖 Pulling Ollama models (this may take a few minutes)..."
echo "   Pulling nomic-embed-text (embedding model)..."
ollama pull nomic-embed-text

echo "   Pulling llama3.2 (chat model)..."
ollama pull llama3.2

# Run setup
echo ""
echo "🔧 Running setup..."
npm run setup

echo ""
echo "✅ Setup complete!"
echo ""
echo "📖 Quick commands:"
echo "   npm run dev          - Start API server"
echo "   npm run cli health   - Check system health"
echo "   npm run cli add -u user123 -c 'Your content' - Add a memory"
echo "   npm run cli search -u user123 -q 'query' - Search memories"
echo "   npm run cli chat -u user123 -m 'Hello' - Chat with memory"
echo ""
echo "🌐 Once the server is running:"
echo "   API: http://localhost:3000"
echo "   Health: http://localhost:3000/health"
echo ""
