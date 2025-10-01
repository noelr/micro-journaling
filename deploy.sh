#!/bin/bash

# Podman deployment script for micro-journal
# Run this on your VPS after pulling latest code

set -e  # Exit on error

echo "======================================"
echo "Micro Journal Podman Deployment"
echo "======================================"
echo ""

# Check if we're in the right directory
if [ ! -f "Dockerfile" ]; then
    echo "Error: Dockerfile not found. Are you in the project root?"
    exit 1
fi

# Check if podman is installed
if ! command -v podman &> /dev/null; then
    echo "❌ Podman is not installed. Please install it first:"

    # Detect package manager
    if command -v apt-get &> /dev/null; then
        echo "   Ubuntu/Debian:"
        echo "   sudo apt-get update && sudo apt-get install podman"
    elif command -v dnf &> /dev/null; then
        echo "   Fedora:"
        echo "   sudo dnf install podman"
    else
        echo "   See: https://podman.io/getting-started/installation"
    fi
    exit 1
fi

# Check if podman-compose is installed
if ! command -v podman-compose &> /dev/null; then
    echo "❌ podman-compose is not installed. Please install it first:"

    # Detect package manager
    if command -v apt-get &> /dev/null; then
        echo "   Ubuntu/Debian:"
        echo "   sudo apt-get update && sudo apt-get install podman-compose"
    elif command -v dnf &> /dev/null; then
        echo "   Fedora:"
        echo "   sudo dnf install podman-compose"
    elif command -v pip3 &> /dev/null; then
        echo "   Via pip:"
        echo "   pip3 install podman-compose"
    else
        echo "   See: https://github.com/containers/podman-compose"
    fi
    exit 1
fi

# Ensure data directory exists
mkdir -p ~/.micro-journal

# Stop existing container (if running)
echo "🛑 Stopping existing container..."
podman-compose down || true

# Build new image
echo "🏗️  Building Podman image..."
podman-compose build --no-cache

# Start container
echo "🚀 Starting container..."
podman-compose up -d

# Wait for container to be healthy
echo "⏳ Waiting for container to be healthy..."
sleep 5

# Check if container is running
if podman-compose ps | grep -q "Up"; then
    echo ""
    echo "✅ Deployment complete!"
    echo ""
    echo "Container status:"
    podman-compose ps
    echo ""
    echo "Useful commands:"
    echo "  podman-compose logs -f          - View logs"
    echo "  podman-compose ps               - Check status"
    echo "  podman-compose restart          - Restart container"
    echo "  podman-compose down             - Stop container"
    echo "  podman exec -it micro-journal sh  - Shell into container"
else
    echo ""
    echo "❌ Deployment failed. Check logs:"
    podman-compose logs
    exit 1
fi
