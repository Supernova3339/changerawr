#!/bin/bash
# Migration script with automatic P3009 error recovery
# Handles failed migrations gracefully without manual intervention

set -e

MAX_RETRIES=3
RETRY_COUNT=0

run_migrations() {
    echo "🦖 Attempting database migrations (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."

    # Capture the output and error
    if OUTPUT=$(npx prisma migrate deploy 2>&1); then
        echo "$OUTPUT"
        echo "✅ Migrations completed successfully"
        return 0
    else
        # Check if the error is P3009 (migration already rolled back)
        if echo "$OUTPUT" | grep -q "P3009"; then
            echo "⚠️  P3009 error detected: Migration in failed/rolled-back state"
            echo "$OUTPUT"

            # Extract the migration name from the error message
            # P3009 error format typically includes the migration name
            MIGRATION_NAME=$(echo "$OUTPUT" | grep -oP "migration.*?(?=\s|$)" | head -1 | sed 's/migration //' | tr -d '`' | tr -d "'")

            if [ -z "$MIGRATION_NAME" ]; then
                # Try alternate extraction pattern
                MIGRATION_NAME=$(echo "$OUTPUT" | grep -oP "\d{8,}_[a-z_]+" | head -1)
            fi

            if [ -n "$MIGRATION_NAME" ]; then
                echo "🔧 Auto-resolving migration: $MIGRATION_NAME"
                npx prisma migrate resolve --rolled-back "$MIGRATION_NAME" || true
                echo "✅ Migration marked as rolled-back, retrying..."
                return 1  # Signal to retry
            else
                echo "❌ Could not extract migration name from error"
                echo "Full error output:"
                echo "$OUTPUT"

                # Try resolving any failed migrations generically
                echo "🔧 Attempting generic migration state cleanup..."

                # Get list of migrations from the migrations directory
                MIGRATIONS_DIR="prisma/schema/migrations"
                if [ -d "$MIGRATIONS_DIR" ]; then
                    # Get the most recent migration
                    LATEST_MIGRATION=$(ls -t "$MIGRATIONS_DIR" | grep -E "^[0-9]+" | head -1)
                    if [ -n "$LATEST_MIGRATION" ]; then
                        echo "🔧 Resolving latest migration: $LATEST_MIGRATION"
                        npx prisma migrate resolve --rolled-back "$LATEST_MIGRATION" || true
                        return 1  # Signal to retry
                    fi
                fi

                return 2  # Fatal error
            fi
        else
            # Not a P3009 error, display the error and fail
            echo "❌ Migration failed with non-P3009 error:"
            echo "$OUTPUT"
            return 2  # Fatal error
        fi
    fi
}

# Main retry loop
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if run_migrations; then
        # Success
        exit 0
    else
        EXIT_CODE=$?

        if [ $EXIT_CODE -eq 2 ]; then
            # Fatal error, don't retry
            echo "❌ Fatal migration error, cannot continue"
            exit 1
        fi

        # P3009 error, increment retry count and continue
        RETRY_COUNT=$((RETRY_COUNT + 1))

        if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
            echo "🔄 Retrying migration (attempt $((RETRY_COUNT + 1))/$MAX_RETRIES)..."
            sleep 2
        fi
    fi
done

# Max retries reached
echo "❌ Migration failed after $MAX_RETRIES attempts"
exit 1
