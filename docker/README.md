# ExamForge Docker Setup

This directory contains the Docker configuration for deploying the ExamForge application stack.

## Services

The Docker Compose setup includes:
- **PostgreSQL**: Main database for the application
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
   docker-compose -f docker/docker-compose.yml up -d
   ```

4. **View logs:**
   ```bash
   docker-compose -f docker/docker-compose.yml logs -f
   ```

## Available Services

- **Frontend**: http://localhost (port 80 mapped to host)
- **API**: http://localhost:3000 (internal port 3000)
- **PostgreSQL**: localhost:5432 (internal port 5432)
- **Redis**: localhost:6379 (internal port 6379)

## Building Images

The Docker Compose file will automatically build the required images from the Dockerfiles in the `docker/` directory. If you need to rebuild:

```bash
docker-compose -f docker/docker-compose.yml build --no-cache
```

## Stopping Services

```bash
docker-compose -f docker/docker-compose.yml down
```

To remove volumes as well (this will delete all data):
```bash
docker-compose -f docker/docker-compose.yml down -v
```

## Customization

You can customize the deployment by modifying the environment variables in the `.env` file:

- `DB_NAME`, `DB_USER`, `DB_PASSWORD`: PostgreSQL credentials
- `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL`: AI service configuration
- `JWT_SECRET`: Secret for JSON Web Tokens
- `NODE_ENV`: Environment mode (production/development)

## Troubleshooting

### Common Issues

1. **Port conflicts**: Make sure ports 80, 3000, 5432, and 6379 are available
2. **Insufficient memory**: Increase Docker's memory allocation if builds fail
3. **Permission errors**: Ensure Docker daemon is running with appropriate permissions

### Useful Commands

- Check service status: `docker-compose -f docker/docker-compose.yml ps`
- View specific service logs: `docker-compose -f docker/docker-compose.yml logs api`
- Execute commands in containers: `docker-compose -f docker/docker-compose.yml exec api sh`
- Check resource usage: `docker stats`

## Production Considerations

For production deployments, ensure you:
- Use strong passwords and secrets
- Configure SSL/TLS termination
- Set up proper backup strategies
- Monitor resource usage
- Regularly update base images