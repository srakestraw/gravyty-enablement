#!/bin/bash
# Add a user to the Admin group in Cognito

USER_POOL_ID="${1:-us-east-1_s4q1vjkgD}"
USERNAME="${2:-scott.rakestraw@gravyty.com}"

if [ -z "$USER_POOL_ID" ] || [ -z "$USERNAME" ]; then
    echo "Usage: $0 <USER_POOL_ID> <USERNAME>"
    echo "Example: $0 us-east-1_s4q1vjkgD scott.rakestraw@gravyty.com"
    exit 1
fi

echo "Adding user '$USERNAME' to Admin group in User Pool '$USER_POOL_ID'..."

# Check if user exists
if ! aws cognito-idp admin-get-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" &>/dev/null; then
    echo "Error: User '$USERNAME' not found in User Pool"
    exit 1
fi

# Check if Admin group exists
if ! aws cognito-idp get-group --user-pool-id "$USER_POOL_ID" --group-name Admin &>/dev/null; then
    echo "Error: Admin group not found. Creating it..."
    aws cognito-idp create-group \
        --user-pool-id "$USER_POOL_ID" \
        --group-name Admin \
        --precedence 4 \
        --description "Full administrative access" || exit 1
fi

# Remove user from other role groups first
for GROUP in Viewer Contributor Approver; do
    if aws cognito-idp admin-list-groups-for-user --user-pool-id "$USER_POOL_ID" --username "$USERNAME" --query "Groups[?GroupName=='$GROUP'].GroupName" --output text | grep -q "$GROUP"; then
        echo "Removing user from $GROUP group..."
        aws cognito-idp admin-remove-user-from-group \
            --user-pool-id "$USER_POOL_ID" \
            --username "$USERNAME" \
            --group-name "$GROUP" 2>/dev/null || true
    fi
done

# Add user to Admin group
echo "Adding user to Admin group..."
aws cognito-idp admin-add-user-to-group \
    --user-pool-id "$USER_POOL_ID" \
    --username "$USERNAME" \
    --group-name Admin

if [ $? -eq 0 ]; then
    echo "✓ Successfully added '$USERNAME' to Admin group"
    echo ""
    echo "User will need to sign out and sign back in for changes to take effect."
else
    echo "✗ Failed to add user to Admin group"
    exit 1
fi
