#!/bin/bash

# YouAndINotAI - Secret Management Script
# GCP Project: spring-asset-476800-u6

set -e

PROJECT_ID="spring-asset-476800-u6"
REGION="us-central1"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Secret names
SECRETS=(
    "db-password"
    "db-url"
    "redis-url"
    "square-token"
    "gemini-api-key"
    "azure-cognitive-key"
    "jwt-secret"
    "jwt-refresh-secret"
)

# Helper functions
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if gcloud is authenticated
check_gcloud_auth() {
    if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
        print_error "Not authenticated with gcloud. Run 'gcloud auth login' first."
        exit 1
    fi
    print_success "Authenticated with gcloud"
}

# Check if project exists and is accessible
check_project() {
    if ! gcloud projects describe "$PROJECT_ID" &>/dev/null; then
        print_error "Cannot access project $PROJECT_ID"
        exit 1
    fi
    print_success "Project $PROJECT_ID is accessible"
}

# Generate a random 32-character string
generate_secret() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-32
}

# Create a secret in Secret Manager
create_secret() {
    local secret_name=$1
    local secret_value=$2
    
    # Check if secret already exists
    if gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        print_warning "Secret $secret_name already exists. Use 'update' to modify it."
        return 1
    fi
    
    # Create the secret
    echo -n "$secret_value" | gcloud secrets create "$secret_name" \
        --data-file=- \
        --replication-policy="automatic" \
        --project="$PROJECT_ID"
    
    print_success "Created secret: $secret_name"
}

# Update an existing secret
update_secret() {
    local secret_name=$1
    local secret_value=$2
    
    # Check if secret exists
    if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        print_error "Secret $secret_name does not exist. Use 'setup' to create it."
        return 1
    fi
    
    # Add new version
    echo -n "$secret_value" | gcloud secrets versions add "$secret_name" \
        --data-file=- \
        --project="$PROJECT_ID"
    
    print_success "Updated secret: $secret_name"
}

# Get secret value
get_secret() {
    local secret_name=$1
    
    if ! gcloud secrets describe "$secret_name" --project="$PROJECT_ID" &>/dev/null; then
        print_error "Secret $secret_name does not exist"
        return 1
    fi
    
    gcloud secrets versions access latest \
        --secret="$secret_name" \
        --project="$PROJECT_ID"
}

# List all secrets
list_secrets() {
    print_info "Listing all secrets in project $PROJECT_ID:"
    gcloud secrets list --project="$PROJECT_ID" --format="table(name,createTime,replication)"
}

# Validate all required secrets exist
validate_secrets() {
    print_info "Validating required secrets..."
    local all_valid=true
    
    for secret in "${SECRETS[@]}"; do
        if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
            print_success "$secret exists"
        else
            print_error "$secret is missing"
            all_valid=false
        fi
    done
    
    if [ "$all_valid" = true ]; then
        print_success "All required secrets are present"
        return 0
    else
        print_error "Some required secrets are missing"
        return 1
    fi
}

# Grant access to a service account
grant_access() {
    local service_account=${1:-"${PROJECT_ID}@appspot.gserviceaccount.com"}
    
    print_info "Granting Secret Manager access to $service_account..."
    
    for secret in "${SECRETS[@]}"; do
        if gcloud secrets describe "$secret" --project="$PROJECT_ID" &>/dev/null; then
            gcloud secrets add-iam-policy-binding "$secret" \
                --member="serviceAccount:$service_account" \
                --role="roles/secretmanager.secretAccessor" \
                --project="$PROJECT_ID" &>/dev/null
            print_success "Granted access to $secret"
        else
            print_warning "Secret $secret does not exist, skipping"
        fi
    done
    
    print_success "Access granted to all existing secrets"
}

# Interactive setup for all secrets
setup_secrets() {
    print_info "Starting interactive secret setup..."
    print_warning "You will be prompted to enter values for each secret."
    echo ""
    
    # db-password
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "db-password: PostgreSQL database password"
    echo "Leave blank to auto-generate a secure password"
    read -sp "Enter value (or press Enter to generate): " db_password
    echo ""
    if [ -z "$db_password" ]; then
        db_password=$(generate_secret)
        print_info "Generated: $db_password"
    fi
    create_secret "db-password" "$db_password" || true
    
    # db-url
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "db-url: Database connection string"
    print_info "Format: postgresql://postgres:PASSWORD@IP:5432/youandinotai"
    read -p "Enter Cloud SQL instance IP: " db_ip
    db_url="postgresql://postgres:${db_password}@${db_ip}:5432/youandinotai"
    create_secret "db-url" "$db_url" || true
    
    # redis-url
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "redis-url: Redis connection string"
    print_info "Format: redis://IP:6379"
    read -p "Enter Redis instance IP: " redis_ip
    redis_url="redis://${redis_ip}:6379"
    create_secret "redis-url" "$redis_url" || true
    
    # square-token
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "square-token: Square API access token"
    read -sp "Enter Square API token: " square_token
    echo ""
    create_secret "square-token" "$square_token" || true
    
    # gemini-api-key
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "gemini-api-key: Gemini API key"
    read -sp "Enter Gemini API key: " gemini_key
    echo ""
    create_secret "gemini-api-key" "$gemini_key" || true
    
    # azure-cognitive-key
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "azure-cognitive-key: Azure Cognitive Services key"
    read -sp "Enter Azure Cognitive Services key: " azure_key
    echo ""
    create_secret "azure-cognitive-key" "$azure_key" || true
    
    # jwt-secret
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "jwt-secret: JWT signing secret"
    echo "Leave blank to auto-generate a secure secret"
    read -sp "Enter value (or press Enter to generate): " jwt_secret
    echo ""
    if [ -z "$jwt_secret" ]; then
        jwt_secret=$(generate_secret)
        print_info "Generated: $jwt_secret"
    fi
    create_secret "jwt-secret" "$jwt_secret" || true
    
    # jwt-refresh-secret
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_info "jwt-refresh-secret: JWT refresh token secret"
    echo "Leave blank to auto-generate a secure secret"
    read -sp "Enter value (or press Enter to generate): " jwt_refresh_secret
    echo ""
    if [ -z "$jwt_refresh_secret" ]; then
        jwt_refresh_secret=$(generate_secret)
        print_info "Generated: $jwt_refresh_secret"
    fi
    create_secret "jwt-refresh-secret" "$jwt_refresh_secret" || true
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    print_success "Secret setup complete!"
}

# Update a single secret interactively
update_single_secret() {
    local secret_name=$1
    
    if [ -z "$secret_name" ]; then
        print_error "Secret name is required"
        echo "Usage: $0 update <secret-name>"
        return 1
    fi
    
    print_info "Updating secret: $secret_name"
    read -sp "Enter new value: " new_value
    echo ""
    
    update_secret "$secret_name" "$new_value"
}

# Update secret from file
update_from_file() {
    local secret_name=$1
    local file_path=$2
    
    if [ -z "$secret_name" ] || [ -z "$file_path" ]; then
        print_error "Secret name and file path are required"
        echo "Usage: $0 update-from-file <secret-name> <file-path>"
        return 1
    fi
    
    if [ ! -f "$file_path" ]; then
        print_error "File not found: $file_path"
        return 1
    fi
    
    local secret_value=$(cat "$file_path")
    update_secret "$secret_name" "$secret_value"
}

# Delete a secret
delete_secret() {
    local secret_name=$1
    
    if [ -z "$secret_name" ]; then
        print_error "Secret name is required"
        echo "Usage: $0 delete <secret-name>"
        return 1
    fi
    
    print_warning "Are you sure you want to delete secret: $secret_name?"
    read -p "Type 'yes' to confirm: " confirmation
    
    if [ "$confirmation" = "yes" ]; then
        gcloud secrets delete "$secret_name" --project="$PROJECT_ID" --quiet
        print_success "Deleted secret: $secret_name"
    else
        print_info "Deletion cancelled"
    fi
}

# Show usage
show_usage() {
    cat << EOF
YouAndINotAI - Secret Management Script

Usage: $0 <command> [arguments]

Commands:
    setup                           Interactive setup for all secrets
    validate                        Validate that all required secrets exist
    list                            List all secrets in the project
    get <secret-name>               Get the value of a secret
    update <secret-name>            Update a secret interactively
    update-from-file <name> <file>  Update secret from file
    delete <secret-name>            Delete a secret
    grant-access [service-account]  Grant secret access to service account
                                    (defaults to App Engine service account)

Examples:
    $0 setup
    $0 validate
    $0 get db-password
    $0 update square-token
    $0 update-from-file gemini-api-key ./api-key.txt
    $0 grant-access my-service@project.iam.gserviceaccount.com

Project: $PROJECT_ID
Region: $REGION
EOF
}

# Main script
main() {
    local command=${1:-""}
    
    if [ -z "$command" ]; then
        show_usage
        exit 0
    fi
    
    # Check prerequisites for most commands
    if [[ "$command" != "help" ]]; then
        check_gcloud_auth
        check_project
    fi
    
    case "$command" in
        setup)
            setup_secrets
            ;;
        validate)
            validate_secrets
            ;;
        list)
            list_secrets
            ;;
        get)
            get_secret "$2"
            ;;
        update)
            update_single_secret "$2"
            ;;
        update-from-file)
            update_from_file "$2" "$3"
            ;;
        delete)
            delete_secret "$2"
            ;;
        grant-access)
            grant_access "$2"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            print_error "Unknown command: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
