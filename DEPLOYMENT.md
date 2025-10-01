# Micro Journal - Podman Deployment Guide

This guide walks you through deploying the micro-journal server using Podman. Podman solves the Node.js version issue by packaging the correct version with the application.

## Prerequisites

- A VPS (Ubuntu/Debian/Fedora)
- A domain name pointed to your VPS
- SSH access to your VPS
- Traefik already installed and running
- Git installed on VPS

**No Node.js installation required!** Podman handles everything.

## Overview

The deployment stack consists of:

- **Podman Container** - Node.js 18 + Express API + static web files
- **Podman Compose** - Container orchestration
- **Traefik** - Reverse proxy, SSL termination, auto-discovery

## Initial VPS Setup

### 1. Install Podman

**For Ubuntu/Debian:**
```bash
# Install Podman
sudo apt-get update
sudo apt-get install -y podman

# Verify installation
podman --version
```

**For Fedora:**
```bash
# Install Podman (usually pre-installed)
sudo dnf install -y podman

# Verify installation
podman --version
```

### 2. Install Podman Compose

**For Ubuntu/Debian:**
```bash
# Install podman-compose
sudo apt-get update
sudo apt-get install podman-compose

# Verify installation
podman-compose --version
```

**For Fedora:**
```bash
# Install podman-compose
sudo dnf install podman-compose

# Verify installation
podman-compose --version
```

### 3. Clone Repository

```bash
# Navigate to your preferred directory
cd ~  # or wherever you keep your apps

# Clone the repository
git clone https://github.com/noelr/micro-journaling.git
cd micro-journaling
```

### 4. Configure Device Name (Optional)

Create the configuration file:

```bash
mkdir -p ~/.micro-journal
nano ~/.micro-journal/config.json
```

Add your device name:

```json
{
  "device": "my-vps"
}
```

### 5. Deploy with Traefik

**Prerequisites:**
- Traefik must be running
- Traefik network must exist: `podman network create traefik`
- Traefik configured with Let's Encrypt

**Deploy:**

```bash
# Run the deployment script
./deploy.sh
```

The script will:
1. Build the Podman image (includes building web frontend)
2. Stop any existing container
3. Start the new container
4. Verify it's healthy

Alternatively, run manually:

```bash
# Create Traefik network if it doesn't exist
podman network create traefik

# Build and start
podman-compose up -d --build

# Check status
podman-compose ps

# View logs
podman-compose logs -f
```

Traefik will automatically:
- Detect the container via labels
- Create route for `mj.noelr.ch`
- Obtain SSL certificate from Let's Encrypt
- Set up HTTP → HTTPS redirect

**Verify:**
```bash
# Check Traefik logs
podman logs traefik

# Visit your domain
curl https://mj.noelr.ch/api/health
```

### 6. Verify Deployment

Test the server:

```bash
# Check container status
podman-compose ps

# Check logs
podman-compose logs

# Test API health endpoint
curl http://localhost:3000/api/health

# Test via Traefik
curl https://mj.noelr.ch/api/health
```

Visit your domain in a browser: `https://mj.noelr.ch`

## Configuring Local CLI to Use VPS

On your local machine(s), configure the CLI tools to notify the VPS server:

### Add to Shell Profile

Add to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export MJ_SERVER_URL=https://journal.yourdomain.com
```

Then reload:

```bash
source ~/.bashrc  # or ~/.zshrc
```

### Verify CLI Connection

```bash
# Create an entry from your local machine
mj "test entry from podman deployment"

# Check on VPS or web interface
# The entry should appear
```

## Updating the Application

When you push new code to the repository:

### Quick Update

```bash
# SSH to VPS
cd ~/micro-journaling

# Pull latest code
git pull

# Run deployment script
./deploy.sh
```

### Manual Update

```bash
# Pull latest code
git pull

# Rebuild and restart
podman-compose down
podman-compose up -d --build

# Or just restart without rebuild
podman-compose restart
```

## Useful Commands

### Podman Compose Commands

```bash
# View logs (follow mode)
podman-compose logs -f

# View logs for last 100 lines
podman-compose logs --tail=100

# Check container status
podman-compose ps

# Restart container
podman-compose restart

# Stop container
podman-compose down

# Start container
podman-compose up -d

# Rebuild and start
podman-compose up -d --build

# Shell into container
podman-compose exec micro-journal sh
```

### Podman Commands

```bash
# List running containers
podman ps

# View container logs
podman logs micro-journal

# Execute command in container
podman exec -it micro-journal sh

# View container resource usage
podman stats micro-journal

# Remove unused images
podman image prune -a
```

### Traefik Commands

```bash
podman logs traefik            # View Traefik logs
podman restart traefik         # Restart Traefik
podman exec traefik traefik healthcheck  # Check health
```

## Troubleshooting

### Container Won't Start

```bash
# Check logs for errors
podman-compose logs

# Try building without cache
podman-compose build --no-cache

# Check if port 3000 is already in use
sudo netstat -tulpn | grep 3000
```

### Web Interface Not Loading

1. Check container status: `podman-compose ps`
2. Check logs: `podman-compose logs`
3. Test direct connection: `curl http://localhost:3000/api/health`
4. Check Traefik: `podman logs traefik`
5. Check if route is registered: `podman exec traefik traefik healthcheck`

### CLI Not Connecting to VPS

1. Verify `MJ_SERVER_URL` is set: `echo $MJ_SERVER_URL`
2. Test server endpoint: `curl https://journal.yourdomain.com/api/health`
3. Check firewall:
   - Ubuntu/Debian: `sudo ufw status`
   - Fedora: `sudo firewall-cmd --list-all`
4. Check container logs: `podman-compose logs`

### Out of Disk Space

Podman images can accumulate over time:

```bash
# Remove unused images
podman image prune -a

# Remove unused volumes
podman volume prune

# Remove everything unused
podman system prune -a
```

### Container Keeps Restarting

```bash
# Check what's causing the restart
podman-compose logs --tail=50

# Check container health
podman inspect micro-journal | grep -A 10 Health

# Try running without detached mode to see errors
podman-compose up
```

### Data Not Persisting

Ensure the volume is mounted correctly:

```bash
# Check volume mounts
podman inspect micro-journal | grep -A 10 Mounts

# Verify data directory exists
ls -la ~/.micro-journal
```

**Fedora-specific (SELinux):**

If you're on Fedora and data isn't persisting, SELinux may be blocking Podman from accessing the volume. Fix with:

```bash
# Allow Podman to access the directory
sudo chcon -Rt svirt_sandbox_file_t ~/.micro-journal

# Or disable SELinux for Podman (not recommended)
# Check SELinux status
sudo getenforce

# View SELinux denials
sudo ausearch -m avc -ts recent
```

## Auto-Start on System Reboot

Podman Compose has `restart: unless-stopped` configured. For rootless Podman, you may want to enable linger:

```bash
# Enable user services to start at boot (for rootless podman)
loginctl enable-linger $USER

# For rootful Podman (if running with sudo)
sudo systemctl enable podman
```

Test by rebooting:

```bash
sudo reboot
# SSH back in
podman-compose ps  # Should show container running
```

## Security Considerations

### Firewall Configuration

**For Ubuntu/Debian (ufw):**
```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable

# Podman manages its own iptables rules
# Traefik handles all external access via labels
```

**For Fedora (firewalld):**
```bash
# Allow SSH, HTTP, HTTPS
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

### Keep System Updated

**For Ubuntu/Debian:**
```bash
# Regular updates
sudo apt update && sudo apt upgrade -y
```

**For Fedora:**
```bash
# Regular updates
sudo dnf upgrade -y
```

**All systems:**
```bash
# Update Podman images
cd ~/micro-journaling
podman-compose pull
podman-compose up -d
```

### Data Backup

Your journal data is stored in `~/.micro-journal/data.json`. Back it up regularly:

```bash
# Manual backup
cp ~/.micro-journal/data.json ~/.micro-journal/data.json.backup

# Automated backup (add to crontab)
crontab -e
# Add this line:
0 2 * * * cp ~/.micro-journal/data.json ~/.micro-journal/data.json.$(date +\%Y\%m\%d)
```

### Container Security

```bash
# Regularly update base images
podman-compose pull
podman-compose up -d --build

# Scan for vulnerabilities (if podman scan available)
podman scan micro-journal
```

## Resource Management

### Monitor Resource Usage

```bash
# Real-time stats
podman stats micro-journal

# Check logs size (varies by setup)
podman system df

# Limit log file size (already configured in docker-compose.yml)
# max-size: 10m, max-file: 3
```

### Memory Limits (Optional)

Edit `podman-compose.yml` to add memory limits:

```yaml
services:
  micro-journal:
    # ... existing config ...
    deploy:
      resources:
        limits:
          memory: 256M
        reservations:
          memory: 128M
```

## Environment Variables

You can customize the container by editing `podman-compose.yml`:

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  # Add any other environment variables here
```

## Dockerfile Explained

Podman uses standard Dockerfiles. The multi-stage build:

1. **Stage 1 (web-builder)**: Builds the React frontend
   - Uses Node.js 18 Alpine
   - Runs `npm run build`
   - Produces optimized static files

2. **Stage 2 (production)**: Final runtime image
   - Uses Node.js 18 Alpine
   - Copies only production dependencies
   - Copies built web assets from stage 1
   - Runs the Express server

Benefits:
- Smaller final image (no dev dependencies)
- Faster builds (cached layers)
- Secure (only production code included)

## Architecture

```
┌─────────────────┐
│  Local Machine  │
│                 │
│  mj "entry"     │──┐
│  mjr 1 done     │  │
└─────────────────┘  │
                     │ HTTPS
                     │ (MJ_SERVER_URL)
                     │
                     ▼
┌──────────────────────────────────────────────────┐
│                    VPS                           │
│                                                  │
│  ┌──────────┐    ┌────────────────────────┐    │
│  │ Traefik  │───▶│   Podman Container     │    │
│  │  :443    │    │                        │    │
│  └──────────┘    │  ┌──────────────────┐ │    │
│   Auto-SSL       │  │  Node.js 18      │ │    │
│   Auto-discovery │  │  Express :3000   │ │    │
│                  │  │  + Web Frontend  │ │    │
│                  │  └──────────────────┘ │    │
│                  └────────────────────────┘    │
│                             │                   │
│                             ▼                   │
│                 Volume Mount:                   │
│                 ~/.micro-journal/               │
│                 ├── data.json                   │
│                 └── config.json                 │
└──────────────────────────────────────────────────┘
```

## Comparison: Podman vs PM2

| Feature | Podman | PM2 |
|---------|--------|-----|
| Node.js Version | Bundled (18) | Uses system Node |
| Setup Complexity | Medium | Low |
| Isolation | Full container | Process-level |
| Resource Usage | ~50MB extra | Minimal |
| Updates | Rebuild image | Git pull + restart |
| Portability | Very high | Medium |
| Learning Curve | Steeper | Gentler |

**Use Podman when:**
- System Node.js is outdated
- Need isolation from other apps
- Want consistent environment across machines
- Plan to run multiple services

**Use PM2 when:**
- System Node.js is adequate
- Prefer simpler setup
- Resource constrained
- Already familiar with PM2

## Next Steps

- Set up automated backups with cron
- Configure monitoring/alerts (e.g., Uptime Robot)
- Set up CI/CD for automatic deployments
- Consider adding authentication for web interface
- Set up log aggregation (e.g., Loki, ELK stack)

## Support

For issues and questions:
- GitHub: https://github.com/noelr/micro-journaling/issues
- Check container logs: `podman-compose logs -f`
- Check Traefik logs: `podman logs traefik`
- Podman documentation: https://docs.podman.io
- Traefik documentation: https://doc.traefik.io/traefik/
