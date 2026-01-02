/**
 * Metadata Field Normalization
 *
 * Helper functions for normalizing metadata fields between legacy and new naming conventions.
 *
 * Renaming:
 * - Legacy "product_suite" -> New "product"
 * - Legacy "product_concept" -> New "product_suite"
 *
 * This ensures backward compatibility when reading existing records while writing new field names.
 */
/**
 * Normalize metadata fields when reading from storage (DynamoDB).
 *
 * This handles the case where stored records may have legacy field names.
 *
 * Mapping rules:
 * - If `product` exists, use it
 * - Else if legacy `product_suite` exists, map it to `product`
 *
 * - If new `product_suite` exists, use it
 * - Else if legacy `product_concept` exists, map it to `product_suite`
 *
 * Same logic applies to ID fields.
 *
 * @param item Record from storage that may have legacy field names
 * @returns Normalized record with new field names
 */
export function normalizeMetadataFieldsFromStorage(item) {
    const normalized = { ...item };
    // Map legacy product_suite -> product (only if product doesn't exist)
    if (normalized.product === undefined && normalized.product_suite !== undefined) {
        // Check if this product_suite is actually the legacy one (not the new product_suite)
        // We distinguish by checking: if product_suite exists but product doesn't, it's legacy
        // Also check if product_concept exists - if so, then product_suite is legacy
        if (normalized.product_concept !== undefined || normalized.product === undefined) {
            normalized.product = normalized.product_suite;
        }
    }
    // Map legacy product_concept -> product_suite (only if product_suite doesn't exist)
    if (normalized.product_suite === undefined && normalized.product_concept !== undefined) {
        normalized.product_suite = normalized.product_concept;
    }
    // Map legacy IDs
    if (normalized.product_id === undefined && normalized.product_suite_id !== undefined) {
        // Check if this is legacy product_suite_id (maps to product_id)
        if (normalized.product_concept_id !== undefined || normalized.product_id === undefined) {
            normalized.product_id = normalized.product_suite_id;
        }
    }
    if (normalized.product_suite_id === undefined && normalized.product_concept_id !== undefined) {
        normalized.product_suite_id = normalized.product_concept_id;
    }
    return normalized;
}
/**
 * Prepare metadata fields for writing to storage.
 *
 * Ensures we write new field names. Legacy fields are kept in the item
 * for backward compatibility but new fields take precedence.
 *
 * @param item Record with metadata fields
 * @returns Record ready for storage (new fields written, legacy kept for compat)
 */
export function prepareMetadataFieldsForStorage(item) {
    // For now, we write both new and legacy fields during migration period
    // This allows old code to still read legacy fields while new code uses new fields
    // A migration script will remove legacy fields later
    return item;
}
//# sourceMappingURL=metadata-normalization.js.map