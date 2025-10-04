# Multi-stage build for micro-journal

# Stage 1: Build web frontend
FROM node:24-alpine3.21 AS web-builder

WORKDIR /app/web

# Copy web package files
COPY web/package*.json ./

# Install dependencies
RUN npm ci

# Copy web source
COPY web/ ./

# Build frontend
RUN npm run build

# Stage 2: Production server
FROM node:24-alpine3.21

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --production

# Copy application code
COPY lib/ ./lib/
COPY server.js ./
COPY mj.js ./
COPY mjr.js ./

# Copy built web assets from builder stage
COPY --from=web-builder /app/web/dist ./web/dist

# Create a non-root user
RUN adduser -D -u 1000 appuser

# Create directory for data (will be mounted as volume)
RUN mkdir -p /home/appuser/.micro-journal && chown -R appuser:appuser /home/appuser /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1) })"

# Start server
CMD ["node", "server.js"]
