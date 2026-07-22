import type {
  EntitlementAccessStatus,
  EntitlementKind,
  EntitlementSnapshot,
  EntitlementSource,
  SubscriptionTier,
} from "../types/entitlement";

export const offlineEntitlementGraceMs = 72 * 60 * 60 * 1_000;
const maximumClockSkewMs = 5 * 60 * 1_000;

const entitlementKinds = new Set<EntitlementKind>([
  "free",
  "premium",
  "temporary",
]);

const entitlementSources = new Set<EntitlementSource>([
  "none",
  "app_store",
  "play_store",
  "web",
  "trial",
  "promotion",
]);

export const freeEntitlement: EntitlementSnapshot = {
  version: 2,
  kind: "free",
  source: "none",
  expiresAt: null,
  verifiedAt: null,
  verificationMode: null,
  autoRenews: false,
};

export type EntitlementAccess = {
  tier: SubscriptionTier;
  status: EntitlementAccessStatus;
  effectiveUntil: string | null;
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function parseEntitlement(value: unknown): EntitlementSnapshot | null {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 2 ||
    !("kind" in value) ||
    typeof value.kind !== "string" ||
    !entitlementKinds.has(value.kind as EntitlementKind) ||
    !("source" in value) ||
    typeof value.source !== "string" ||
    !entitlementSources.has(value.source as EntitlementSource) ||
    !("expiresAt" in value) ||
    (value.expiresAt !== null && !isIsoDate(value.expiresAt)) ||
    !("verifiedAt" in value) ||
    (value.verifiedAt !== null && !isIsoDate(value.verifiedAt)) ||
    !("verificationMode" in value) ||
    (value.verificationMode !== null &&
      value.verificationMode !== "online" &&
      value.verificationMode !== "offline") ||
    !("autoRenews" in value) ||
    typeof value.autoRenews !== "boolean"
  ) {
    return null;
  }

  const entitlement: EntitlementSnapshot = {
    version: 2,
    kind: value.kind as EntitlementKind,
    source: value.source as EntitlementSource,
    expiresAt: value.expiresAt,
    verifiedAt: value.verifiedAt,
    verificationMode: value.verificationMode,
    autoRenews: value.autoRenews,
  };

  if (entitlement.kind === "free") {
    return entitlement.source === "none" &&
        entitlement.expiresAt === null &&
        entitlement.verifiedAt === null &&
        entitlement.verificationMode === null &&
        entitlement.autoRenews === false
      ? freeEntitlement
      : null;
  }

  if (
    entitlement.verifiedAt === null ||
    entitlement.expiresAt === null ||
    entitlement.verificationMode === null
  ) {
    return null;
  }

  if (
    entitlement.kind === "temporary" &&
    entitlement.source !== "trial" &&
    entitlement.source !== "promotion"
  ) {
    return null;
  }

  if (
    entitlement.kind === "premium" &&
    entitlement.source !== "app_store" &&
    entitlement.source !== "play_store" &&
    entitlement.source !== "web"
  ) {
    return null;
  }

  return entitlement;
}

export function getEntitlementAccess(
  entitlement: EntitlementSnapshot,
  {
    trusted,
    now = new Date(),
  }: {
    trusted: boolean;
    now?: Date;
  },
): EntitlementAccess {
  if (entitlement.kind === "free") {
    return { tier: "free", status: "free", effectiveUntil: null };
  }

  if (!trusted) {
    return { tier: "free", status: "unverified", effectiveUntil: null };
  }

  const verifiedAt = Date.parse(entitlement.verifiedAt ?? "");
  const expiresAt = Date.parse(entitlement.expiresAt ?? "");
  const nowMs = now.getTime();

  if (
    !Number.isFinite(verifiedAt) ||
    !Number.isFinite(expiresAt) ||
    verifiedAt > nowMs + maximumClockSkewMs ||
    expiresAt <= verifiedAt
  ) {
    return { tier: "free", status: "stale", effectiveUntil: null };
  }

  const graceEndsAt = verifiedAt + offlineEntitlementGraceMs;
  const effectiveUntilMs = Math.min(expiresAt, graceEndsAt);

  if (effectiveUntilMs <= nowMs) {
    return {
      tier: "free",
      status: "stale",
      effectiveUntil: new Date(effectiveUntilMs).toISOString(),
    };
  }

  return {
    tier: "premium",
    status: entitlement.verificationMode === "offline"
      ? "offline_grace"
      : "verified",
    effectiveUntil: new Date(effectiveUntilMs).toISOString(),
  };
}

export function getEntitlementLabel(
  entitlement: EntitlementSnapshot,
  tier: SubscriptionTier,
) {
  if (tier === "free") {
    return "Free";
  }

  return entitlement.kind === "temporary" ? "Временный Premium" : "Premium";
}
