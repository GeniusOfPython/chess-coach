import type {
  EntitlementKind,
  EntitlementSnapshot,
  EntitlementSource,
  SubscriptionTier,
} from "../types/entitlement";

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
  version: 1,
  kind: "free",
  source: "none",
  expiresAt: null,
  verifiedAt: null,
  autoRenews: false,
};

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

export function parseEntitlement(value: unknown): EntitlementSnapshot {
  if (
    typeof value !== "object" ||
    value === null ||
    !("version" in value) ||
    value.version !== 1 ||
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
    !("autoRenews" in value) ||
    typeof value.autoRenews !== "boolean"
  ) {
    return freeEntitlement;
  }

  const entitlement: EntitlementSnapshot = {
    version: 1,
    kind: value.kind as EntitlementKind,
    source: value.source as EntitlementSource,
    expiresAt: value.expiresAt,
    verifiedAt: value.verifiedAt,
    autoRenews: value.autoRenews,
  };

  if (entitlement.kind === "free") {
    return freeEntitlement;
  }

  if (entitlement.verifiedAt === null) {
    return freeEntitlement;
  }

  if (entitlement.kind === "temporary" && entitlement.expiresAt === null) {
    return freeEntitlement;
  }

  if (
    entitlement.kind === "temporary" &&
    entitlement.source !== "trial" &&
    entitlement.source !== "promotion"
  ) {
    return freeEntitlement;
  }

  if (
    entitlement.kind === "premium" &&
    entitlement.source !== "app_store" &&
    entitlement.source !== "play_store" &&
    entitlement.source !== "web"
  ) {
    return freeEntitlement;
  }

  return entitlement;
}

export function isEntitlementActive(
  entitlement: EntitlementSnapshot,
  now = new Date(),
) {
  if (entitlement.kind === "free") {
    return false;
  }

  if (entitlement.expiresAt === null) {
    return entitlement.kind === "premium";
  }

  return Date.parse(entitlement.expiresAt) > now.getTime();
}

export function getEntitlementTier(
  entitlement: EntitlementSnapshot,
  now = new Date(),
): SubscriptionTier {
  return isEntitlementActive(entitlement, now) ? "premium" : "free";
}

export function getEntitlementLabel(
  entitlement: EntitlementSnapshot,
  now = new Date(),
) {
  if (getEntitlementTier(entitlement, now) === "free") {
    return "Free";
  }

  return entitlement.kind === "temporary" ? "Временный Premium" : "Premium";
}
