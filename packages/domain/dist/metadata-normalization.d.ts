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
export declare function normalizeMetadataFieldsFromStorage<T extends Record<string, any>>(item: T): T;
/**
 * Prepare metadata fields for writing to storage.
 *
 * Ensures we write new field names. Legacy fields are kept in the item
 * for backward compatibility but new fields take precedence.
 *
 * @param item Record with metadata fields
 * @returns Record ready for storage (new fields written, legacy kept for compat)
 */
export declare function prepareMetadataFieldsForStorage<T extends Record<string, any>>(item: T): T;
//# sourceMappingURL=metadata-normalization.d.ts.map