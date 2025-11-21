# Installation Guide

This guide walks you through installing the required dependencies for the GitHub Copilot Memory System.

## Prerequisites

You need to install two main components:
1. **Podman** - Container runtime for Qdrant vector database
2. **Ollama** - Local LLM for embeddings

## Install Podman

Podman is used to run the Qdrant vector database in a container.

### macOS

```bash
brew install podman
podman machine init
podman machine start
```

Verify installation:
```bash
podman --version
podman machine list
```

### Linux

**Ubuntu/Debian:**
```bash
sudo apt-get update
sudo apt-get install -y podman
```

**Fedora:**
```bash
sudo dnf install -y podman
```

**Arch Linux:**
```bash
sudo pacman -S podman
```

Verify installation:
```bash
podman --version
```

### Windows

**Using winget:**
```bash
winget install -e --id RedHat.Podman
```

**Or download installer:**
Visit [podman.io](https://podman.io/getting-started/installation) and download the Windows installer.

Verify installation:
```bash
podman --version
```

## Install Ollama

Ollama provides local LLM inference for generating embeddings.

### macOS

```bash
brew install ollama
```

Start Ollama service:
```bash
ollama serve
```

### Linux

```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

Start Ollama service:
```bash
ollama serve
```

For systemd (optional - auto-start on boot):
```bash
sudo systemctl enable ollama
sudo systemctl start ollama
```

### Windows

**Using winget:**
```bash
winget install -e --id Ollama.Ollama
```

**Or download installer:**
Visit [ollama.ai](https://ollama.ai) and download the Windows installer.

Verify installation:
```bash
ollama --version
```

## Pull Required Model

After installing Ollama, pull the embedding model:

```bash
ollama pull nomic-embed-text
```

Verify the model is downloaded:
```bash
ollama list
```

You should see `nomic-embed-text` in the list.

## Verify All Services

### Check Podman
```bash
podman --version
podman machine list  # macOS/Windows
podman ps           # Check running containers
```

### Check Ollama
```bash
ollama --version
ollama list         # Should show nomic-embed-text
curl http://localhost:11434/api/tags  # Check API
```

## Troubleshooting

### Podman Issues

**Machine won't start (macOS/Windows):**
```bash
podman machine stop
podman machine rm
podman machine init
podman machine start
```

**Permission denied (Linux):**
```bash
sudo usermod -aG podman $USER
newgrp podman
```

### Ollama Issues

**Service not running:**
```bash
# Check if running
ps aux | grep ollama

# Start manually
ollama serve
```

**Model download fails:**
```bash
# Check disk space
df -h

# Try pulling again
ollama pull nomic-embed-text
```

**Port already in use:**
```bash
# Check what's using port 11434
lsof -i :11434

# Kill the process or use different port
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

## Next Steps

Once both Podman and Ollama are installed and running:

1. Return to the [main README](../README.md)
2. Continue with "Setup & Running MCP Server"
3. Start using the memory system!

## System Requirements

**Minimum:**
- 4 GB RAM
- 2 CPU cores
- 5 GB disk space

**Recommended:**
- 8 GB RAM
- 4 CPU cores
- 10 GB disk space

## Support

For installation issues:
- Podman: https://github.com/containers/podman/issues
- Ollama: https://github.com/ollama/ollama/issues
