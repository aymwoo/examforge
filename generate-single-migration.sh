#!/bin/bash

# ExamForge Single Migration Generator
# This script combines all Prisma migrations into a single SQL file

set -e  # Exit on any error

echo "🔄 Generating consolidated migration file..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Navigate to project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Navigate to API directory
cd apps/api

# Generate Prisma client
print_status "Generating Prisma client..."
pnpm prisma:generate

# Create a temporary database to introspect the schema
print_status "Creating temporary database to extract schema..."
TEMP_DB_PATH="/tmp/examforge_temp.db"
rm -f "$TEMP_DB_PATH"

# Set environment variable to use temporary database
export DATABASE_URL="file:$TEMP_DB_PATH"

# Push the schema to the temporary database
print_status "Pushing schema to temporary database..."
npx prisma db push

# Generate SQL dump of the schema
print_status "Generating consolidated SQL migration..."
npx prisma db pull --schema=./prisma/schema.prisma

# Convert the schema to SQL
SCHEMA_FILE="./prisma/schema.prisma"
OUTPUT_SQL="../single-migration.sql"

# Use Prisma to generate the SQL for the schema
echo "-- ExamForge Consolidated Database Schema" > "$OUTPUT_SQL"
echo "-- Generated on $(date)" >> "$OUTPUT_SQL"
echo "" >> "$OUTPUT_SQL"

# Get the SQL schema by temporarily creating a new migration
TEMP_MIGRATION_NAME="temp_consolidated_$(date +%Y%m%d_%H%M%S)"
npx prisma migrate diff \
  --from-empty \
  --to-schema-datamodel "$SCHEMA_FILE" \
  --script \
  --name "$TEMP_MIGRATION_NAME" 2>/dev/null || true

# Move the generated migration to our consolidated file
if [ -d "./prisma/migrations/$TEMP_MIGRATION_NAME" ]; then
    cat "./prisma/migrations/$TEMP_MIGRATION_NAME/migration.sql" >> "$OUTPUT_SQL"
    
    # Clean up temporary migration
    rm -rf "./prisma/migrations/$TEMP_MIGRATION_NAME"
fi

print_success "✅ Consolidated migration saved to: $OUTPUT_SQL"

# Show the first few lines of the generated file
print_status "Preview of consolidated migration:"
head -20 "$OUTPUT_SQL"

# Return to project root
cd ../..

print_status "Consolidated migration generation completed!"