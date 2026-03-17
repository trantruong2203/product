# Docker Local Development Setup

This guide explains how to run the GEO SaaS project using Docker for local development.

## Prerequisites

- Docker Desktop installed and running
- Docker Compose v2.0+
- At least 4GB RAM allocated to Docker

## Quick Start

### 1. Start All Services

```bash
docker-compose up -d
```

This will start:
- **PostgreSQL** (port 5432)
- **Redis** (port 6379)
- **Backend API** (port 3001)
- **Frontend** (port 5173)
- **Worker** (background job processor)

### 2. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/health
- **Metrics**: http://localhost:3001/metrics

### 3. View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f worker
docker-compose logs -f postgres
docker-compose logs -f redis
```

## Common Commands

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove Volumes (Clean Slate)

```bash
docker-compose down -v
```

### Rebuild Images

```bash
docker-compose build
```

### Rebuild Specific Service

```bash
docker-compose build backend
docker-compose build frontend
docker-compose build worker
```

### Restart a Service

```bash
docker-compose restart backend
```

## Environment Configuration

The project uses `.env.local` for local development settings:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/geo_saas
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long-12345
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
PORT=3001
```

To use custom environment variables, edit `.env.local` before starting containers.

## Database Migrations

Migrations run automatically when the backend starts. To manually run migrations:

```bash
docker-compose exec backend npm run db:push
```

## Troubleshooting

### Port Already in Use

If ports 3001, 5173, 5432, or 6379 are already in use:

1. Stop the conflicting service
2. Or modify `docker-compose.yml` to use different ports

### PostgreSQL Version Mismatch

If you see "database files are incompatible with server":

```bash
docker-compose down -v
docker-compose up -d
```

This removes old volumes and creates a fresh database.

### Services Not Starting

Check logs for specific service:

```bash
docker-compose logs postgres
docker-compose logs backend
```

### Hot Reload Not Working

The containers have volume mounts for source code. Changes should reflect immediately:

- **Backend**: `./backend/src` → `/app/src`
- **Frontend**: `./frontend/src` → `/app/src`
- **Worker**: `./worker/src` → `/app/src`

If changes don't reflect, restart the service:

```bash
docker-compose restart backend
```

## Development Workflow

1. **Start containers**: `docker-compose up -d`
2. **Make code changes** in your editor
3. **Changes auto-reload** in containers
4. **View logs** to debug: `docker-compose logs -f service-name`
5. **Stop when done**: `docker-compose down`

## Performance Tips

- Allocate at least 4GB RAM to Docker
- Use SSD for better I/O performance
- On Windows/Mac, consider using WSL2 backend for Docker Desktop

## Production Deployment

For production deployment, use the main branch without Docker or deploy to cloud services (AWS, GCP, Azure, etc.).

## Support

For issues or questions, check the main README.md or project documentation.
