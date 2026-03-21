/**
 * VPS Optimization Guide
 * 
 * This document describes the optimizations made to run GEO SaaS on a 2GB RAM VPS.
 * 
 * ## Memory Allocation
 * 
 * Total RAM: 2GB (2048MB)
 * - Worker (Playwright): 1200MB max
 * - Backend: 384MB
 * - PostgreSQL: 256MB
 * - Redis: 128MB
 * - Frontend: 256MB
 * 
 * Recommended SWAP: 2GB
 * 
 * ## Key Optimizations
 * 
 * ### 1. Browser Pool Limits
 * - MAX_BROWSER_CONTEXTS=1 (single context to minimize memory)
 * - WORKER_CONCURRENCY=1 (sequential processing)
 * - Automatic context cleanup when memory threshold exceeded
 * 
 * ### 2. Playwright Memory Optimization
 * - --disable-dev-shm-usage (use tmpfs instead of /dev/shm)
 * - --disable-gpu (no GPU on VPS)
 * - --no-zygote (single process mode)
 * - --single-process (reduces memory footprint)
 * - --disable-webgl, --disable-webgl2 (memory savings)
 * 
 * ### 3. Docker Memory Limits
 * - Each service has explicit memory constraints
 * - Health checks configured for all services
 * - Restart policies for fault tolerance
 * 
 * ### 4. Monitoring
 * - Health check endpoints on port 8080
 * - Prometheus metrics exposed
 * - Memory usage logged every 30 seconds
 * - Auto cleanup when memory exceeds threshold
 * 
 * ## Deployment Steps
 * 
 * 1. Initial VPS Setup:
 *    ```bash
 *    sudo bash setup-vps.sh    # Install Docker and system optimizations
 *    sudo bash setup-swap.sh   # Configure 2GB SWAP
 *    ```
 * 
 * 2. Deploy Application:
 *    ```bash
 *    git clone <repo>
 *    cd geo-saas
 *    
 *    # Configure environment
 *    cp .env.example .env
 *    # Edit .env with your settings
 *    
 *    # Build and start
 *    docker compose build
 *    docker compose up -d
 *    ```
 * 
 * 3. Verify Deployment:
 *    ```bash
 *    # Check service health
 *    curl http://localhost:8080/health
 *    
 *    # Check metrics
 *    curl http://localhost:8080/metrics
 *    
 *    # View logs
 *    docker compose logs -f worker
 *    ```
 * 
 * ## Health Check Endpoints
 * 
 * Worker exposes these endpoints on port 8080:
 * - GET /health  - Full health status
 * - GET /metrics - Prometheus metrics
 * - GET /ready   - Kubernetes readiness probe
 * - GET /live    - Kubernetes liveness probe
 * 
 * ## Troubleshooting
 * 
 * ### Out of Memory
 * If services crash due to OOM:
 * 1. Check `docker compose logs` for details
 * 2. Reduce MAX_BROWSER_CONTEXTS to 1
 * 3. Increase SWAP if available
 * 4. Consider upgrading VPS to 4GB
 * 
 * ### Browser Launch Failures
 * - Ensure /dev/shm is large enough (or use --disable-dev-shm-usage)
 * - Check available disk space for Chrome profiles
 * - Verify network connectivity for browser updates
 * 
 * ### High CPU Usage
 * - Reduce WORKER_CONCURRENCY to 1
 * - Limit concurrent URL validations
 * - Disable verbose logging in production
 */
