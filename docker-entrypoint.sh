#!/bin/bash
set -e

# Mirror all stdout/stderr to a log file so the maintenance page can expose
# the raw console output (via the maintenance server's /startup/logs
# endpoint) for debugging deploys that get stuck with no terminal access.
STARTUP_LOG="/tmp/changerawr-startup.log"
exec > >(tee "$STARTUP_LOG") 2>&1

# Plain-text step log the maintenance server reads directly off disk. Each
# line is one state transition for one step: STEP|STATE|MESSAGE|TIMESTAMP.
# STATE is one of: running|done|warning|error|skipped. The maintenance page
# renders a checklist from this log directly - no HTTP service, no curl, no
# progress-percentage guessing, no "stuck" inference.
STATUS_LOG="/tmp/changerawr-status-log"
: > "$STATUS_LOG"

# write_step STEP STATE MESSAGE
write_step() {
    printf '%s|%s|%s|%s\n' "$1" "$2" "$3" "$(date +%s)" >> "$STATUS_LOG"
}

echo "🦖 Starting Changerawr deployment..."

# Start the Extension Builder Service early as a long-running background
# service (lazy-Prisma, so it's safe before `prisma generate` below). It is
# not on the critical path for boot progress - it just needs to be up by the
# time Next.js's instrumentation (app/startup.ts) checks for it on port 3010,
# so it doesn't spawn a second instance.
echo "🦖 Starting Extension Builder Service..."
node scripts/extension-builder/server.js > /tmp/changerawr-builder.log 2>&1 &
BUILDER_PID=$!

# Re-download the maintenance page and its server from GitHub before
# launching them. This is a self-healing step for deploy platforms whose
# build cache can leave a stale scripts/maintenance/ in the image even after
# a fresh push - since server.js itself is what's stale in that case, fixing
# it from inside server.js isn't possible, so it has to happen here, before
# the file is ever executed. Falls back to the bundled copies if GitHub is
# unreachable (e.g. air-gapped deployments).
MAINTENANCE_BRANCH="${MAINTENANCE_BRANCH:-1.0.7}"
MAINTENANCE_BASE_URL="https://raw.githubusercontent.com/Supernova3339/changerawr/${MAINTENANCE_BRANCH}/scripts/maintenance"
echo "🦖 Refreshing maintenance page from GitHub (branch: $MAINTENANCE_BRANCH)..."
for f in index.html server.js; do
    if wget -q -T 10 -O "/tmp/maintenance-$f" "$MAINTENANCE_BASE_URL/$f"; then
        mv "/tmp/maintenance-$f" "scripts/maintenance/$f"
        echo "✅ Updated scripts/maintenance/$f from GitHub"
    else
        rm -f "/tmp/maintenance-$f"
        echo "⚠️  Could not fetch scripts/maintenance/$f from GitHub, using bundled copy"
    fi
done

# Start maintenance server in the background. This is the ONLY thing
# blocking startup waits on for UI - it's a tiny static HTTP server with no
# dependencies on Prisma, the extension builder, or anything else that could
# fail to come up.
echo "🦖 Starting maintenance server..."
node scripts/maintenance/server.js &
MAINTENANCE_PID=$!

cleanup_maintenance() {
    if [ -n "$MAINTENANCE_PID" ]; then
        echo "🦖 Stopping maintenance server..."
        kill $MAINTENANCE_PID 2>/dev/null || true
    fi
}
trap cleanup_maintenance EXIT

sleep 1
echo "🦖 Maintenance server running (PID: $MAINTENANCE_PID)"

# ---------------------------------------------------------------------------
# BLOCKING PHASE - everything the maintenance page waits on. Nothing starts
# (nginx, Next.js) until this entire phase finishes. Steps that aren't
# strictly required for the app to run (widget, swagger, extension imports)
# are timeout-bounded and non-fatal so a transient failure there can't hang
# the deploy forever; the extension-aware rebuild is also timeout-bounded as
# a last-resort safety net, but is expected to complete normally every time.
# ---------------------------------------------------------------------------

echo "🦖 Generating Prisma client..."
write_step "prisma-generate" "running" "Generating Prisma client"
timeout 300 npx prisma generate
write_step "prisma-generate" "done" "Prisma client generated"

echo "🦖 Running database migrations with automatic recovery..."
write_step "migrations" "running" "Running database migrations"
# Use migration script with automatic P3009 error recovery
chmod +x scripts/migrate-with-recovery.sh
if timeout 300 bash scripts/migrate-with-recovery.sh; then
    write_step "migrations" "done" "Database migrations complete"
else
    write_step "migrations" "error" "Database migrations failed"
    echo "❌ Database migration failed - check logs above for details"
    exit 1
fi

echo "🦖 Building widget..."
write_step "widget" "running" "Building widget"
if timeout 180 npm run build:widget; then
    echo "✅ Widget build complete"
    write_step "widget" "done" "Widget built"
else
    echo "⚠️  Widget build failed or timed out - continuing without it"
    write_step "widget" "warning" "Widget build failed - continuing without it"
fi

echo "🦖 Generating Swagger documentation..."
write_step "swagger" "running" "Generating API documentation"
if timeout 180 npm run generate-swagger; then
    echo "✅ Swagger documentation generated"
    write_step "swagger" "done" "API documentation generated"
else
    echo "⚠️  Swagger generation failed or timed out - continuing without it"
    write_step "swagger" "warning" "Swagger generation failed - continuing without it"
fi

if [ -n "$(find extensions -mindepth 2 -maxdepth 2 -type d 2>/dev/null)" ]; then
    echo "🦖 Installed extensions detected - regenerating imports..."
    write_step "extensions-generate" "running" "Preparing installed extensions"
    if timeout 180 npm run extensions:generate; then
        echo "✅ Extension imports regenerated - rebuilding application..."
        write_step "extensions-generate" "done" "Extension imports regenerated"
        write_step "rebuild" "running" "Rebuilding application with extensions (this can take several minutes)"
        if CI_BUILD_MODE=1 DOCKER_BUILD=1 timeout 1800 npm run build; then
            echo "✅ Rebuild complete"
            write_step "rebuild" "done" "Rebuild complete"
        else
            echo "⚠️  Rebuild failed or timed out (exit $?) - extensions unavailable until next deploy"
            write_step "rebuild" "error" "Extension rebuild failed - continuing without new extensions"
        fi
    else
        echo "⚠️  Extension import/safelist generation failed or timed out - continuing with existing extensionLoader"
        write_step "extensions-generate" "warning" "Extension import generation failed - continuing without changes"
        write_step "rebuild" "skipped" "Skipped due to extension import failure"
    fi
else
    echo "🦖 No installed extensions, nothing to rebuild"
    write_step "extensions-generate" "skipped" "No installed extensions"
    write_step "rebuild" "skipped" "No installed extensions"
fi

echo "🦖 Setup complete! Stopping maintenance server..."
write_step "starting-app" "running" "Starting application services"
cleanup_maintenance

# Small delay to ensure port is released
sleep 1

# Clean up any leftover domain configs from previous runs that might reference missing certs
echo "🦖 Cleaning up any stale domain configs..."
rm -f /etc/nginx/sites-enabled/*.conf 2>/dev/null || true
echo "🦖 Cleaned up $(ls -1 /etc/nginx/sites-enabled/*.conf 2>/dev/null | wc -l) domain configs"

# Test and start nginx in daemon mode (background)
echo "🦖 Testing nginx configuration..."
if ! nginx -t 2>&1; then
    echo "❌ nginx configuration test failed even after cleanup!"
    echo "🦖 Last chance: nuking cert directory and retrying..."

    # Nuclear option: remove all certs and configs
    rm -rf /etc/ssl/changerawr/* 2>/dev/null || true
    rm -f /etc/nginx/sites-enabled/*.conf 2>/dev/null || true

    if ! nginx -t 2>&1; then
        echo "❌ nginx configuration is fundamentally broken, exiting..."
        exit 1
    fi
    echo "✅ nginx configuration fixed after nuclear cleanup!"
fi

echo "🦖 Starting nginx..."
nginx 2>&1
if [ $? -eq 0 ]; then
    echo "🦖 nginx started successfully"
else
    echo "⚠️  nginx failed to start, continuing without nginx..."
fi

# Start nginx-agent if SSL is enabled
if [ "$NEXT_PUBLIC_SSL_ENABLED" = "true" ]; then
    echo "🦖 Starting nginx-agent..."
    if [ -d /nginx-agent ]; then
        cd /nginx-agent

        # Set agent environment variables
        export AGENT_SECRET="${NGINX_AGENT_SECRET}"
        export CHANGERAWR_URL="http://127.0.0.1:3000"
        export INTERNAL_API_SECRET="${INTERNAL_API_SECRET}"
        export AGENT_PORT="${NGINX_AGENT_PORT:-7842}"
        export CERT_DIR="/etc/ssl/changerawr"
        export NGINX_DIR="/etc/nginx/sites-enabled"
        export NGINX_RELOAD_CMD="/usr/local/bin/nginx-reload.sh"

        # Make sure agent doesn't try to bind to port 80
        npm start 2>&1 &
        NGINX_AGENT_PID=$!
        echo "🦖 nginx-agent running (PID: $NGINX_AGENT_PID)"
        cd /app
    else
        echo "⚠️  nginx-agent directory not found, skipping..."
    fi
else
    echo "🦖 SSL not enabled, skipping nginx-agent..."
fi

# Start Next.js application in background
echo "🦖 Starting Next.js application on port 3000..."
export PORT=3000
export HOSTNAME="0.0.0.0"
"$@" &
APP_PID=$!
echo "🦖 Next.js running (PID: $APP_PID)"
write_step "starting-app" "done" "Application services started"
write_step "ready" "done" "Application ready"

# Function to handle shutdown gracefully
shutdown() {
    echo "🦖 Shutting down..."

    # Stop Next.js
    if [ -n "$APP_PID" ]; then
        echo "🦖 Stopping Next.js (PID: $APP_PID)..."
        kill -TERM "$APP_PID" 2>/dev/null || true
        wait "$APP_PID" 2>/dev/null || true
    fi

    # Stop nginx-agent
    if [ -n "$NGINX_AGENT_PID" ]; then
        echo "🦖 Stopping nginx-agent (PID: $NGINX_AGENT_PID)..."
        kill -TERM "$NGINX_AGENT_PID" 2>/dev/null || true
        wait "$NGINX_AGENT_PID" 2>/dev/null || true
    fi

    # Stop Extension Builder Service
    if [ -n "$BUILDER_PID" ]; then
        echo "🦖 Stopping Extension Builder Service (PID: $BUILDER_PID)..."
        kill -TERM "$BUILDER_PID" 2>/dev/null || true
        wait "$BUILDER_PID" 2>/dev/null || true
    fi

    # Stop nginx
    echo "🦖 Stopping nginx..."
    nginx -s quit 2>/dev/null || true

    # The captured startup log has served its purpose (debugging a stuck/slow
    # deploy via the maintenance page). Keep it around for the whole container
    # lifetime so it stays available while Next.js boots and runs, only
    # removing it now as part of shutdown.
    rm -f "$STARTUP_LOG" "$STATUS_LOG"

    echo "🦖 Shutdown complete"
    exit 0
}

# Trap signals for graceful shutdown
trap shutdown SIGTERM SIGINT

# Wait for the Next.js process and exit when it does
echo "🦖 All services started. Waiting for Next.js process..."
wait "$APP_PID" && APP_EXIT=0 || APP_EXIT=$?
echo "🦖 Next.js process exited (code $APP_EXIT)"
shutdown
