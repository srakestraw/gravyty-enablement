/**
 * Content Hub Scheduler Job
 *
 * EventBridge scheduled Lambda that:
 * - Publishes scheduled versions when publishAt <= now
 * - Expires published versions when expireAt <= now
 *
 * Runs every 5 minutes, idempotent.
 */
import { ScanCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDocClient } from '../dynamoClient';
import { publishVersion, expireVersion } from '@gravyty/domain';
import { notifySubscribersNewVersion, notifySubscribersExpired } from './notifications';
const CONTENT_TABLE = process.env.DDB_TABLE_CONTENT || 'content_registry';
/**
 * Run the Content Hub scheduler job
 *
 * @param options.now - Current time (defaults to now)
 * @returns Summary of job execution
 */
export async function runContentHubScheduler(options = {}) {
    const now = options.now || new Date();
    const nowISO = now.toISOString();
    const result = {
        published: 0,
        expired: 0,
        errors: 0,
        errorDetails: [],
    };
    try {
        // Get scheduled versions ready to publish
        const scheduledCommand = new ScanCommand({
            TableName: CONTENT_TABLE,
            FilterExpression: '#entity_type = :entity_type AND #status = :status AND #publish_at <= :now',
            ExpressionAttributeNames: {
                '#entity_type': 'entity_type',
                '#status': 'status',
                '#publish_at': 'publish_at',
            },
            ExpressionAttributeValues: {
                ':entity_type': 'ASSET_VERSION',
                ':status': 'scheduled',
                ':now': nowISO,
            },
        });
        const scheduledResult = await dynamoDocClient.send(scheduledCommand);
        const scheduledVersions = (scheduledResult.Items || []);
        for (const version of scheduledVersions) {
            try {
                // Publish the version (using system user)
                const { version: publishedVersion, asset: assetUpdate } = publishVersion(version, 'system', // System user for scheduled publishes
                'Automatically published by scheduler');
                // Update version
                const versionUpdateCommand = new UpdateCommand({
                    TableName: CONTENT_TABLE,
                    Key: { content_id: version.version_id },
                    UpdateExpression: 'SET #status = :status, published_by = :published_by, published_at = :published_at, change_log = :change_log, publish_at = :publish_at, updated_at = :updated_at',
                    ExpressionAttributeNames: {
                        '#status': 'status',
                    },
                    ExpressionAttributeValues: {
                        ':status': 'published',
                        ':published_by': 'system',
                        ':published_at': publishedVersion.published_at,
                        ':change_log': publishedVersion.change_log,
                        ':publish_at': null,
                        ':updated_at': publishedVersion.updated_at,
                    },
                });
                await dynamoDocClient.send(versionUpdateCommand);
                // Update asset
                const assetUpdateCommand = new UpdateCommand({
                    TableName: CONTENT_TABLE,
                    Key: { content_id: version.asset_id },
                    UpdateExpression: 'SET current_published_version_id = :version_id, updated_at = :updated_at, updated_by = :updated_by',
                    ExpressionAttributeValues: {
                        ':version_id': version.version_id,
                        ':updated_at': assetUpdate.updated_at,
                        ':updated_by': assetUpdate.updated_by,
                    },
                });
                await dynamoDocClient.send(assetUpdateCommand);
                // Notify subscribers of new version
                try {
                    const updatedAsset = await dynamoDocClient.send(new GetCommand({
                        TableName: CONTENT_TABLE,
                        Key: { content_id: version.asset_id },
                    }));
                    if (updatedAsset.Item) {
                        const asset = updatedAsset.Item;
                        // Get subscriptions for this asset
                        const subscriptionScan = new ScanCommand({
                            TableName: CONTENT_TABLE,
                            FilterExpression: '#entity_type = :entity_type AND #target_type = :target_type AND #target_id = :target_id',
                            ExpressionAttributeNames: {
                                '#entity_type': 'entity_type',
                                '#target_type': 'target_type',
                                '#target_id': 'target_id',
                            },
                            ExpressionAttributeValues: {
                                ':entity_type': 'SUBSCRIPTION',
                                ':target_type': 'asset',
                                ':target_id': version.asset_id,
                            },
                        });
                        const subscriptionResult = await dynamoDocClient.send(subscriptionScan);
                        const subscriptions = (subscriptionResult.Items || []);
                        notifySubscribersNewVersion(subscriptions, asset, publishedVersion).catch(err => {
                            console.error(`[Scheduler] Error notifying subscribers for version ${version.version_id}:`, err);
                        });
                    }
                }
                catch (notifyErr) {
                    console.error(`[Scheduler] Error fetching subscriptions for notification:`, notifyErr);
                    // Don't fail the publish if notification fails
                }
                result.published++;
            }
            catch (error) {
                result.errors++;
                const errorMsg = `Failed to publish version ${version.version_id}: ${error instanceof Error ? error.message : String(error)}`;
                result.errorDetails?.push(errorMsg);
                console.error(errorMsg);
            }
        }
        // Get published versions ready to expire
        const expireCommand = new ScanCommand({
            TableName: CONTENT_TABLE,
            FilterExpression: '#entity_type = :entity_type AND #status = :status AND #expire_at <= :now',
            ExpressionAttributeNames: {
                '#entity_type': 'entity_type',
                '#status': 'status',
                '#expire_at': 'expire_at',
            },
            ExpressionAttributeValues: {
                ':entity_type': 'ASSET_VERSION',
                ':status': 'published',
                ':now': nowISO,
            },
        });
        const expireResult = await dynamoDocClient.send(expireCommand);
        const versionsToExpire = (expireResult.Items || []);
        for (const version of versionsToExpire) {
            try {
                // Expire the version
                const expiredVersion = expireVersion(version);
                // Update version
                const versionUpdateCommand = new UpdateCommand({
                    TableName: CONTENT_TABLE,
                    Key: { content_id: version.version_id },
                    UpdateExpression: 'SET #status = :status, updated_at = :updated_at',
                    ExpressionAttributeNames: {
                        '#status': 'status',
                    },
                    ExpressionAttributeValues: {
                        ':status': 'expired',
                        ':updated_at': expiredVersion.updated_at,
                    },
                });
                await dynamoDocClient.send(versionUpdateCommand);
                // If this was the current published version, update asset
                const assetGetCommand = new GetCommand({
                    TableName: CONTENT_TABLE,
                    Key: { content_id: version.asset_id },
                });
                const assetResult = await dynamoDocClient.send(assetGetCommand);
                const asset = assetResult.Item;
                if (asset && asset.current_published_version_id === version.version_id) {
                    // Find next latest published version (simplified - would need proper query in production)
                    const assetUpdateCommand = new UpdateCommand({
                        TableName: CONTENT_TABLE,
                        Key: { content_id: version.asset_id },
                        UpdateExpression: 'SET current_published_version_id = :version_id',
                        ExpressionAttributeValues: {
                            ':version_id': null, // TODO: Find actual latest published version
                        },
                    });
                    await dynamoDocClient.send(assetUpdateCommand);
                    // If asset was pinned and expired, auto-unpin
                    if (asset.pinned) {
                        const unpinCommand = new UpdateCommand({
                            TableName: CONTENT_TABLE,
                            Key: { content_id: version.asset_id },
                            UpdateExpression: 'SET pinned = :pinned, updated_at = :updated_at',
                            ExpressionAttributeValues: {
                                ':pinned': false,
                                ':updated_at': nowISO,
                            },
                        });
                        await dynamoDocClient.send(unpinCommand);
                        // TODO: Notify owner/approver about auto-unpin
                        console.log(`Auto-unpinned expired asset ${version.asset_id}`);
                    }
                    // Notify subscribers of expiration
                    try {
                        const subscriptionScan = new ScanCommand({
                            TableName: CONTENT_TABLE,
                            FilterExpression: '#entity_type = :entity_type AND #target_type = :target_type AND #target_id = :target_id',
                            ExpressionAttributeNames: {
                                '#entity_type': 'entity_type',
                                '#target_type': 'target_type',
                                '#target_id': 'target_id',
                            },
                            ExpressionAttributeValues: {
                                ':entity_type': 'SUBSCRIPTION',
                                ':target_type': 'asset',
                                ':target_id': version.asset_id,
                            },
                        });
                        const subscriptionResult = await dynamoDocClient.send(subscriptionScan);
                        const subscriptions = (subscriptionResult.Items || []);
                        notifySubscribersExpired(subscriptions, asset, expiredVersion).catch(err => {
                            console.error(`[Scheduler] Error notifying subscribers for expired version ${version.version_id}:`, err);
                        });
                    }
                    catch (notifyErr) {
                        console.error(`[Scheduler] Error fetching subscriptions for expiration notification:`, notifyErr);
                    }
                }
                result.expired++;
            }
            catch (error) {
                result.errors++;
                const errorMsg = `Failed to expire version ${version.version_id}: ${error instanceof Error ? error.message : String(error)}`;
                result.errorDetails?.push(errorMsg);
                console.error(errorMsg);
            }
        }
    }
    catch (error) {
        const errorMsg = `Scheduler job failed: ${error instanceof Error ? error.message : String(error)}`;
        result.errorDetails?.push(errorMsg);
        console.error(errorMsg);
        throw error;
    }
    return result;
}
/**
 * Lambda handler for EventBridge scheduled trigger
 */
export async function handler(event) {
    console.log('Content Hub Scheduler triggered:', JSON.stringify(event));
    try {
        const result = await runContentHubScheduler();
        console.log('Scheduler completed:', JSON.stringify(result));
        return {
            statusCode: 200,
            body: JSON.stringify({
                success: true,
                result,
            }),
        };
    }
    catch (error) {
        console.error('Scheduler failed:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                success: false,
                error: error instanceof Error ? error.message : String(error),
            }),
        };
    }
}
//# sourceMappingURL=scheduler.js.map