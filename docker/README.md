# ExamForge Docker Setup

This directory contains the Docker configuration for deploying the ExamForge application stack.

## Services

The Docker Compose setup includes:

- **SQLite**: File-based database mounted into the API container
- **Redis**: Caching and session storage
- **API**: NestJS backend service
- **Web**: React frontend served via nginx

## Prerequisites

- Docker Engine (v20.10.0 or higher)
- Docker Compose (v2.0.0 or higher)
- At least 4GB of RAM available to Docker

## Quick Start

1. **Copy the environment file:**

   ```bash
   cp docker/.env.example docker/.env
   ```

2. **Edit the environment file with your configuration:**

   ```bash
   nano docker/.env
   ```

   Make sure to set the required values, especially:
   - `LLM_API_KEY`: Your LLM provider API key
   - `JWT_SECRET`: A strong secret for JWT tokens

3. **Start the services:**

   ```bash
   # Default registries (npmjs/alpine)
   docker-compose -f docker/docker-compose.default.yml up -d

   # China mirrors (npm mirror + aliyun apk)
   docker-compose -f docker/docker-compose.build.yml up -d
   ```

   Notes:
   - `docker-compose.default.yml` uses default npm/alpine registries.
   - `docker-compose.build.yml` passes mirror build args to Dockerfiles.

4. **View logs:**
   ```bash
   docker-compose -f docker/docker-compose.build.yml logs -f
   ```

## Available Services

- **Frontend**: http://localhost (port 80 mapped to host)
- **API**: http://localhost:3000 (internal port 3000)
- **SQLite**: Stored in `docker/sqlite/prod.db` (mounted into the API)
- **Redis**: localhost:6379 (internal port 6379)

## Building Images

The build compose file will automatically build the required images from the Dockerfiles in the `docker/` directory. If you need to rebuild:

```bash
# Default registries
docker-compose -f docker/docker-compose.default.yml build --no-cache

# China mirrors
docker-compose -f docker/docker-compose.build.yml build --no-cache
```

## Stopping Services

```bash
docker-compose -f docker/docker-compose.build.yml down
```

To remove volumes as well (this will delete all data):

```bash
docker-compose -f docker/docker-compose.build.yml down -v
```

## Customization

You can customize the deployment by modifying the environment variables in the `.env` file:

- `DATABASE_URL`: SQLite database path (default: `file:./prisma/prod.db`)
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`: AI service configuration
- `JWT_SECRET`: Secret for JSON Web Tokens
- `NODE_ENV`: Environment mode (production/development)

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 80, 3000, and 6379 are available
2. **Insufficient memory**: Increase Docker's memory allocation if builds fail
3. **Permission errors**: Ensure Docker daemon is running with appropriate permissions
4. **SQLite file permissions**: Ensure `docker/sqlite` is writable by Docker

### Useful Commands

- Check service status: `docker-compose -f docker/docker-compose.build.yml ps`
- View specific service logs: `docker-compose -f docker/docker-compose.build.yml logs api`
- Execute commands in containers: `docker-compose -f docker/docker-compose.build.yml exec api sh`
- Check resource usage: `docker stats`

## Production Considerations

For production deployments, ensure you:

- Use strong passwords and secrets
- Configure SSL/TLS termination
- Set up proper backup strategies
- Monitor resource usage
- Regularly update base images
