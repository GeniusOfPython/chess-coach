import { useCallback, useEffect, useState } from "react";
import {
  getEntitlementTier,
  parseEntitlement,
} from "../features/entitlement";
import {
  purchaseProvider,
  type PurchaseProvider,
} from "../platform/purchases/purchaseProvider";
import { entitlementRepository } from "../repositories/entitlementRepository";
import type {
  EntitlementSnapshot,
  PurchaseRestoreStatus,
} from "../types/entitlement";

export function useEntitlement(
  provider: PurchaseProvider = purchaseProvider,
) {
  const [snapshot, setSnapshot] = useState<EntitlementSnapshot>(() =>
    entitlementRepository.load()
  );
  const [restoreStatus, setRestoreStatus] = useState<PurchaseRestoreStatus>(
    "idle",
  );
  const [expiryTick, setExpiryTick] = useState(0);

  const storeSnapshot = useCallback((value: unknown) => {
    const nextSnapshot = parseEntitlement(value);
    entitlementRepository.save(nextSnapshot);
    setSnapshot(nextSnapshot);
    return nextSnapshot;
  }, []);

  useEffect(() => {
    if (!provider.available) {
      return;
    }

    let active = true;

    void provider.getCurrentEntitlement()
      .then((value) => {
        if (active) {
          storeSnapshot(value);
        }
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [provider, storeSnapshot]);

  useEffect(() => {
    if (!snapshot.expiresAt) {
      return;
    }

    const remainingMs = Date.parse(snapshot.expiresAt) - Date.now();

    if (remainingMs <= 0) {
      return;
    }

    const timer = window.setTimeout(
      () => setExpiryTick((value) => value + 1),
      Math.min(remainingMs + 50, 2_147_000_000),
    );

    return () => window.clearTimeout(timer);
  }, [snapshot.expiresAt, expiryTick]);

  const tier = getEntitlementTier(snapshot, new Date());

  const restorePurchases = useCallback(async () => {
    if (!provider.available || restoreStatus === "restoring") {
      return;
    }

    setRestoreStatus("restoring");

    try {
      const restored = storeSnapshot(await provider.restorePurchases());
      setRestoreStatus(
        getEntitlementTier(restored) === "premium"
          ? "restored"
          : "not_found",
      );
    } catch {
      setRestoreStatus("error");
    }
  }, [provider, restoreStatus, storeSnapshot]);

  return {
    snapshot,
    tier,
    canRestorePurchases: provider.available,
    restoreStatus,
    restorePurchases,
  };
}
