/**
 * Broadcast Recovery Worker
 *
 * Periodically checks for broadcast messages stuck in "sending" status
 * and reprocesses them. This handles cases where:
 * - Server restarted mid-broadcast
 * - processBroadcastMessage failed silently
 * - setImmediate didn't complete
 *
 * Also processes individual members stuck in "pending" status.
 */

import { getDb } from '../db';
import { broadcastMessages, broadcastMembersSent } from '../../drizzle/schema';
import { eq, and, lt, sql } from 'drizzle-orm';
import { processBroadcastMessage } from '../workers/broadcast-sender';

const RECOVERY_INTERVAL_MS = 60 * 1000; // Check every 60 seconds
const STUCK_THRESHOLD_MINUTES = 2; // Messages stuck for 2+ minutes are considered stuck

let recoveryTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Start the broadcast recovery worker
 */
export function startBroadcastRecoveryWorker() {
  if (recoveryTimer) return; // Already running

  console.log('[BroadcastRecovery] 🔄 Starting recovery worker (checks every 60s)');

  recoveryTimer = setInterval(async () => {
    try {
      await recoverStuckBroadcasts();
    } catch (err: unknown) {
      console.error('[BroadcastRecovery] Error in recovery loop:', err.message);
    }
  }, RECOVERY_INTERVAL_MS);

  // Run once immediately on startup
  setImmediate(() => recoverStuckBroadcasts());
}

/**
 * Find and reprocess stuck broadcast messages
 */
async function recoverStuckBroadcasts() {
  const db = await getDb();
  if (!db) return;

  // Find messages with status "sending" that are older than threshold
  const cutoff = new Date(Date.now() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

  const stuckMessages = await db
    .select({
      id: broadcastMessages.id,
      status: broadcastMessages.status,
    })
    .from(broadcastMessages)
    .where(
      and(
        eq(broadcastMessages.status, 'sending'),
        lt(broadcastMessages.sentAt, cutoff)
      )
    )
    .limit(10);

  if (stuckMessages.length === 0) return;

  console.log(
    `[BroadcastRecovery] 🔍 Found ${stuckMessages.length} stuck broadcast(s), reprocessing...`
  );

  for (const msg of stuckMessages) {
    try {
      await processBroadcastMessage(msg.id);
      console.log(`[BroadcastRecovery] ✅ Reprocessed broadcast ${msg.id}`);
    } catch (err: unknown) {
      console.error(
        `[BroadcastRecovery] ❌ Failed to reprocess broadcast ${msg.id}:`,
        err.message
      );

      // Mark as failed if recovery also fails
      try {
        await db
          .update(broadcastMessages)
          .set({ status: 'failed', errorMessage: `Recovery failed: ${err.message}` })
          .where(eq(broadcastMessages.id, msg.id));
      } catch {
        // Give up
      }
    }
  }
}

/**
 * Stop the recovery worker
 */
export function stopBroadcastRecoveryWorker() {
  if (recoveryTimer) {
    clearInterval(recoveryTimer);
    recoveryTimer = null;
    console.log('[BroadcastRecovery] 🛑 Stopped');
  }
}
