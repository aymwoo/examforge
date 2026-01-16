#!/bin/bash

# ExamForge Migration Consolidator
# This script combines all individual migration files into a single consolidated SQL file

set -e  # Exit on any error

echo "🔄 Consolidating all migrations into a single SQL file..."

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

# Define source and destination paths
MIGRATIONS_DIR="apps/api/prisma/migrations"
CONSOLIDATED_FILE="consolidated-migrations.sql"

print_status "Looking for migrations in: $MIGRATIONS_DIR"

# Check if migrations directory exists
if [ ! -d "$MIGRATIONS_DIR" ]; then
    print_error "Migrations directory not found: $MIGRATIONS_DIR"
    exit 1
fi

# Create the consolidated file with header
{
    echo "-- ExamForge Consolidated Migrations"
    echo "-- Generated on $(date)"
    echo "-- Contains all migrations combined into a single file"
    echo ""
    echo "BEGIN TRANSACTION;"
    echo ""
} > "$CONSOLIDATED_FILE"

# Find all migration.sql files and concatenate them
find "$MIGRATIONS_DIR" -name "migration.sql" -type f | sort | while read -r sql_file; do
    migration_dir=$(dirname "$sql_file")
    migration_name=$(basename "$migration_dir")
    
    echo "-- ---------------------------------------------------------" >> "$CONSOLIDATED_FILE"
    echo "-- Migration: $migration_name" >> "$CONSOLIDATED_FILE"
    echo "-- ---------------------------------------------------------" >> "$CONSOLIDATED_FILE"
    echo "" >> "$CONSOLIDATED_FILE"
    
    # Append the content of the migration file
    cat "$sql_file" >> "$CONSOLIDATED_FILE"
    echo "" >> "$CONSOLIDATED_FILE"
    echo "-- End of migration: $migration_name" >> "$CONSOLIDATED_FILE"
    echo "" >> "$CONSOLIDATED_FILE"
done

# Add transaction commit at the end
{
    echo "-- ---------------------------------------------------------"
    echo "-- All migrations applied successfully"
    echo "-- ---------------------------------------------------------"
    echo ""
    echo "COMMIT;"
    echo ""
} >> "$CONSOLIDATED_FILE"

print_success "✅ All migrations consolidated into: $CONSOLIDATED_FILE"

# Show summary
migration_count=$(find "$MIGRATIONS_DIR" -name "migration.sql" | wc -l)
line_count=$(wc -l < "$CONSOLIDATED_FILE")

print_status "Summary:"
print_status "  - $migration_count individual migrations processed"
print_status "  - $line_count lines in consolidated file"
print_status "  - File size: $(du -h "$CONSOLIDATED_FILE" | cut -f1)"

# Show the first few lines as a preview
print_status "Preview of consolidated file:"
head -20 "$CONSOLIDATED_FILE"

print_success "🎉 Migration consolidation completed!"