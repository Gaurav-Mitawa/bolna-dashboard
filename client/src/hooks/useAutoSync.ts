import { useEffect, useRef, useCallback, useState } from "react";
import { syncContactsFromBolna } from "@/services/bolnaSync";
import { toast } from "sonner";

export type SyncStatus = "idle" | "syncing" | "error" | "offline";

interface UseAutoSyncOptions {
  /** Sync interval in minutes (default: 5) */
  intervalMinutes?: number;
  /** Whether to sync on initial mount (default: true) */
  syncOnMount?: boolean;
  /** Whether to sync when tab becomes visible (default: true) */
  syncOnVisible?: boolean;
  /** Optional date range for syncing */
  from?: string;
  to?: string;
}

interface UseAutoSyncReturn {
  /** Current sync status */
  status: SyncStatus;
  /** Last successful sync timestamp */
  lastSyncAt: Date | null;
  /** Error message if sync failed */
  error: string | null;
  /** Manually trigger a sync */
  syncNow: () => Promise<void>;
  /** Whether a sync is currently in progress */
  isSyncing: boolean;
  /** Whether the backend appears to be offline */
  isOffline: boolean;
}

/**
 * Hook for automatic Bolna contact synchronization
 * - Syncs on component mount (if backend is available)
 * - Syncs periodically based on interval
 * - Pauses when tab is hidden (visibility API)
 * - Resumes when tab becomes visible
 * - Tracks sync status and last sync time
 * - Handles offline state gracefully
 */
export function useAutoSync(options: UseAutoSyncOptions = {}): UseAutoSyncReturn {
  const {
    intervalMinutes = 5,
    syncOnMount = true,
    syncOnVisible = true,
    from,
    to,
  } = options;

  const [status, setStatus] = useState<SyncStatus>("idle");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  const performSync = useCallback(async (): Promise<void> => {
    // Prevent concurrent syncs
    if (isSyncingRef.current) {
      console.log("⏭️ Sync already in progress, skipping...");
      return;
    }

    isSyncingRef.current = true;
    setStatus("syncing");
    setError(null);

    try {
      console.log("🔄 Auto-syncing contacts from Bolna...");
      const result = await syncContactsFromBolna(from, to);
      
      setLastSyncAt(new Date());
      setStatus("idle");
      setIsOffline(false);
      
      if (result.created > 0 || result.updated > 0) {
        console.log(`✅ Sync complete: ${result.created} created, ${result.updated} updated`);
        toast.success(`Synced: ${result.created} created, ${result.updated} updated`);
      } else {
        console.log("✅ Sync complete: No changes");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Sync failed";
      console.error("❌ Auto-sync error:", errorMessage);
      
      // Check if it's a network/offline error
      if (errorMessage.includes("Network Error") || errorMessage.includes("ERR_CONNECTION_REFUSED")) {
        setStatus("offline");
        setIsOffline(true);
        console.log("🔌 Backend appears to be offline");
      } else {
        setStatus("error");
        setError(errorMessage);
        toast.error(`Sync failed: ${errorMessage}`);
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [from, to]);

  // Sync on mount
  useEffect(() => {
    if (syncOnMount) {
      performSync();
    }
  }, [syncOnMount, performSync]);

  // Set up interval for periodic sync
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval (convert minutes to milliseconds)
    const intervalMs = intervalMinutes * 60 * 1000;
    intervalRef.current = setInterval(() => {
      // Only sync if tab is visible and we're not offline
      if (document.visibilityState === "visible" && !isOffline) {
        performSync();
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [intervalMinutes, performSync, isOffline]);

  // Handle visibility changes
  useEffect(() => {
    if (!syncOnVisible) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("👁️ Tab became visible, triggering sync...");
        performSync();
      } else {
        console.log("🙈 Tab hidden, pausing sync...");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [syncOnVisible, performSync]);

  return {
    status,
    lastSyncAt,
    error,
    syncNow: performSync,
    isSyncing: status === "syncing",
    isOffline,
  };
}
