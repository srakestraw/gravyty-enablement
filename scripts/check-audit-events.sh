#!/bin/bash
#
# Check DynamoDB events table for admin audit events
# Usage: ./check-audit-events.sh [TABLE_NAME] [DAYS_AGO]
#

TABLE_NAME="${1:-events}"
DAYS_AGO="${2:-1}"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Checking audit events in table: $TABLE_NAME"
echo "Looking for events from the last $DAYS_AGO day(s)"
echo ""

# Calculate date bucket (YYYY-MM-DD format)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    DATE_BUCKET=$(date -u -v-${DAYS_AGO}d +%Y-%m-%d)
else
    # Linux
    DATE_BUCKET=$(date -u -d "$DAYS_AGO days ago" +%Y-%m-%d)
fi

echo "Date bucket: $DATE_BUCKET"
echo ""

# Query for admin events
echo "Querying for admin_users_* events..."
ADMIN_EVENTS=$(aws dynamodb query \
    --table-name "$TABLE_NAME" \
    --key-condition-expression "date_bucket = :date AND begins_with(ts#event_id, :prefix)" \
    --expression-attribute-values "{
        \":date\": {\"S\": \"$DATE_BUCKET\"},
        \":prefix\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M)\"}
    }" \
    --filter-expression "contains(event_name, :admin)" \
    --expression-attribute-values "{
        \":date\": {\"S\": \"$DATE_BUCKET\"},
        \":prefix\": {\"S\": \"$(date -u +%Y-%m-%dT%H:%M)\"},
        \":admin\": {\"S\": \"admin_users\"}
    }" \
    --query 'Items[]' \
    --output json 2>/dev/null || echo "[]")

if [ "$ADMIN_EVENTS" = "[]" ] || [ -z "$ADMIN_EVENTS" ]; then
    echo -e "${YELLOW}No admin_users_* events found in the last $DAYS_AGO day(s)${NC}"
    echo ""
    echo "To check all events for today:"
    echo "  aws dynamodb query --table-name $TABLE_NAME \\"
    echo "    --key-condition-expression 'date_bucket = :date' \\"
    echo "    --expression-attribute-values '{ \":date\": { \"S\": \"$DATE_BUCKET\" } }'"
else
    COUNT=$(echo "$ADMIN_EVENTS" | jq 'length' 2>/dev/null || echo "0")
    echo -e "${GREEN}Found $COUNT admin audit events${NC}"
    echo ""
    echo "$ADMIN_EVENTS" | jq -r '.[] | "\(.event_name.S // .event_name) - \(.ts#event_id.S // .ts)"' 2>/dev/null || echo "$ADMIN_EVENTS"
fi
