import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  freeEntitlement,
  getEntitlementAccess,
  parseEntitlement,
  type EntitlementAccess,
} from "../features/entitlement";
import {
  purchaseProvider,
  type PurchaseProvider,
} from "../platform/purchases/purchaseProvider";
import { entitlementRepository } from "../repositories/entitlementRepository";
import { addNativeResumeListener } from "../platform/nativeEvents";
import type {
  EntitlementSnapshot,
  EntitlementVerificationStatus,
  PurchaseOffersStatus,
  PurchaseRestoreStatus,
  PurchaseStatus,
  SubscriptionOffer,
} from "../types/entitlement";

type EntitlementSession = {
  snapshot: EntitlementSnapshot;
  access: EntitlementAccess;
};

const initialSession: EntitlementSession = {
  snapshot: freeEntitlement,
  access: getEntitlementAccess(freeEntitlement, { trusted: false }),
};

export function useEntitlement(
  provider: PurchaseProvider = purchaseProvider,
) {
  const accessRequestSequence = useRef(0);
  const commerceOperationInProgress = useRef(false);
  const [session, setSession] = useState<EntitlementSession>(initialSession);
  const [verificationStatus, setVerificationStatus] =
    useState<EntitlementVerificationStatus>(
      provider.available ? "checking" : "unavailable",
    );
  const [restoreStatus, setRestoreStatus] = useState<PurchaseRestoreStatus>(
    "idle",
  );
  const [offersStatus, setOffersStatus] = useState<PurchaseOffersStatus>(
    "idle",
  );
  const [offers, setOffers] = useState<SubscriptionOffer[]>([]);
  const [purchaseStatus, setPurchaseStatus] = useState<PurchaseStatus>("idle");
  const [managementStatus, setManagementStatus] = useState<
    "idle" | "opening" | "error"
  >("idle");

  const acceptProviderClaim = useCallback((value: unknown) => {
    const parsed = parseEntitlement(value);

    if (!parsed) {
      throw new Error("Invalid entitlement response");
    }

    const access = getEntitlementAccess(parsed, {
      trusted: true,
      now: new Date(),
    });
    const acceptedSnapshot = access.tier === "premium"
      ? parsed
      : freeEntitlement;

    entitlementRepository.clearLegacyAccess();
    setSession({ snapshot: acceptedSnapshot, access });
    return access;
  }, []);

  const clearAccess = useCallback(() => {
    entitlementRepository.clearLegacyAccess();
    setSession(initialSession);
  }, []);

  const refreshEntitlement = useCallback(async () => {
    if (commerceOperationInProgress.current) {
      return;
    }

    const requestId = ++accessRequestSequence.current;

    if (!provider.available) {
      clearAccess();
      setVerificationStatus("unavailable");
      return;
    }

    setVerificationStatus("checking");

    try {
      const value = await provider.getCurrentEntitlement();

      if (requestId !== accessRequestSequence.current) {
        return;
      }

      acceptProviderClaim(value);
      setVerificationStatus("ready");
    } catch {
      if (requestId !== accessRequestSequence.current) {
        return;
      }

      clearAccess();
      setVerificationStatus("error");
    }
  }, [acceptProviderClaim, clearAccess, provider]);

  useEffect(() => {
    void refreshEntitlement();

    return () => {
      accessRequestSequence.current += 1;
    };
  }, [refreshEntitlement]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshEntitlement();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    const removeNativeResumeListener = addNativeResumeListener(() => {
      void refreshEntitlement();
    });
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      removeNativeResumeListener();
    };
  }, [refreshEntitlement]);

  useEffect(() => {
    if (session.access.tier !== "premium" || !session.access.effectiveUntil) {
      return;
    }

    const remainingMs = Date.parse(session.access.effectiveUntil) - Date.now();

    if (remainingMs <= 0) {
      void refreshEntitlement();
      return;
    }

    const timer = window.setTimeout(
      () => void refreshEntitlement(),
      Math.min(remainingMs + 50, 2_147_000_000),
    );

    return () => window.clearTimeout(timer);
  }, [refreshEntitlement, session.access.effectiveUntil, session.access.tier]);

  const loadOffers = useCallback(async () => {
    if (!provider.canPurchase || offersStatus === "loading") {
      return;
    }

    setOffersStatus("loading");

    try {
      const nextOffers = await provider.getOfferings();
      setOffers(nextOffers);
      setOffersStatus(nextOffers.length > 0 ? "ready" : "empty");
    } catch {
      setOffers([]);
      setOffersStatus("error");
    }
  }, [offersStatus, provider]);

  const purchasePremium = useCallback(async (productId: string) => {
    if (
      !provider.canPurchase ||
      commerceOperationInProgress.current ||
      purchaseStatus === "purchasing" ||
      !offers.some((offer) => offer.productId === productId)
    ) {
      return;
    }

    setPurchaseStatus("purchasing");
    commerceOperationInProgress.current = true;
    const requestId = ++accessRequestSequence.current;

    try {
      const value = await provider.purchase(productId);

      if (requestId !== accessRequestSequence.current) {
        return;
      }

      const access = acceptProviderClaim(value);
      setPurchaseStatus(access.tier === "premium" ? "purchased" : "error");
      setVerificationStatus("ready");
    } catch {
      if (requestId === accessRequestSequence.current) {
        setPurchaseStatus("error");
      }
    } finally {
      commerceOperationInProgress.current = false;
    }
  }, [acceptProviderClaim, offers, provider, purchaseStatus]);

  const restorePurchases = useCallback(async () => {
    if (
      !provider.available ||
      commerceOperationInProgress.current ||
      restoreStatus === "restoring"
    ) {
      return;
    }

    setRestoreStatus("restoring");
    commerceOperationInProgress.current = true;
    const requestId = ++accessRequestSequence.current;

    try {
      const value = await provider.restorePurchases();

      if (requestId !== accessRequestSequence.current) {
        return;
      }

      const access = acceptProviderClaim(value);
      setRestoreStatus(access.tier === "premium" ? "restored" : "not_found");
      setVerificationStatus("ready");
    } catch {
      if (requestId === accessRequestSequence.current) {
        setRestoreStatus("error");
      }
    } finally {
      commerceOperationInProgress.current = false;
    }
  }, [acceptProviderClaim, provider, restoreStatus]);

  const openSubscriptionManagement = useCallback(async () => {
    if (!provider.canManageSubscription || managementStatus === "opening") {
      return;
    }

    setManagementStatus("opening");

    try {
      await provider.openSubscriptionManagement();
      setManagementStatus("idle");
    } catch {
      setManagementStatus("error");
    }
  }, [managementStatus, provider]);

  return useMemo(() => ({
    snapshot: session.snapshot,
    tier: session.access.tier,
    accessStatus: session.access.status,
    effectiveUntil: session.access.effectiveUntil,
    verificationStatus,
    canRestorePurchases: provider.available,
    restoreStatus,
    restorePurchases,
    canPurchase: provider.canPurchase,
    offers,
    offersStatus,
    loadOffers,
    purchaseStatus,
    purchasePremium,
    canManageSubscription: provider.canManageSubscription,
    managementStatus,
    openSubscriptionManagement,
  }), [
    loadOffers,
    managementStatus,
    offers,
    offersStatus,
    openSubscriptionManagement,
    provider.available,
    provider.canManageSubscription,
    provider.canPurchase,
    purchasePremium,
    purchaseStatus,
    restorePurchases,
    restoreStatus,
    session,
    verificationStatus,
  ]);
}
