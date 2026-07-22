import { describe, expect, it } from "vitest";
import {
  freeEntitlement,
  getEntitlementAccess,
  getEntitlementLabel,
  parseEntitlement,
} from "./entitlement";

const verifiedPremium = {
  version: 2,
  kind: "premium",
  source: "app_store",
  expiresAt: "2026-08-22T12:00:00.000Z",
  verifiedAt: "2026-07-22T12:00:00.000Z",
  verificationMode: "online",
  autoRenews: true,
} as const;

describe("entitlement", () => {
  it("по умолчанию, при повреждённых и старых данных выдаёт только Free", () => {
    expect(parseEntitlement(null)).toBeNull();
    expect(parseEntitlement({ kind: "premium" })).toBeNull();
    expect(parseEntitlement({ ...verifiedPremium, version: 1 }))
      .toBeNull();
    expect(parseEntitlement(freeEntitlement)).toEqual(freeEntitlement);
    expect(parseEntitlement({
      ...freeEntitlement,
      source: "web",
    })).toBeNull();
    expect(getEntitlementAccess(freeEntitlement, { trusted: false }).tier)
      .toBe("free");
  });

  it("принимает активную подписку только от доверенного провайдера", () => {
    const entitlement = parseEntitlement(verifiedPremium)!;
    const trusted = getEntitlementAccess(entitlement, {
      trusted: true,
      now: new Date("2026-07-22T12:05:00.000Z"),
    });
    const localCache = getEntitlementAccess(entitlement, {
      trusted: false,
      now: new Date("2026-07-22T12:05:00.000Z"),
    });

    expect(trusted).toMatchObject({ tier: "premium", status: "verified" });
    expect(localCache).toEqual({
      tier: "free",
      status: "unverified",
      effectiveUntil: null,
    });
    expect(getEntitlementLabel(entitlement, trusted.tier)).toBe("Premium");
  });

  it("ограничивает офлайн-доступ 72 часами после проверки", () => {
    const entitlement = parseEntitlement({
      ...verifiedPremium,
      verificationMode: "offline",
    })!;

    expect(getEntitlementAccess(entitlement, {
      trusted: true,
      now: new Date("2026-07-25T11:59:59.000Z"),
    })).toMatchObject({ tier: "premium", status: "offline_grace" });
    expect(getEntitlementAccess(entitlement, {
      trusted: true,
      now: new Date("2026-07-25T12:00:00.000Z"),
    })).toMatchObject({ tier: "free", status: "stale" });
  });

  it("не продлевает доступ за пределы срока подписки", () => {
    const entitlement = parseEntitlement({
      ...verifiedPremium,
      expiresAt: "2026-07-23T12:00:00.000Z",
      verificationMode: "offline",
    })!;

    expect(getEntitlementAccess(entitlement, {
      trusted: true,
      now: new Date("2026-07-23T12:00:00.000Z"),
    })).toMatchObject({ tier: "free", status: "stale" });
  });

  it("отклоняет противоречивый источник и время проверки из будущего", () => {
    expect(parseEntitlement({
      ...verifiedPremium,
      kind: "temporary",
      source: "app_store",
    })).toBeNull();

    const futureClaim = parseEntitlement({
      ...verifiedPremium,
      verifiedAt: "2026-07-23T12:00:00.000Z",
    })!;
    expect(getEntitlementAccess(futureClaim, {
      trusted: true,
      now: new Date("2026-07-22T12:00:00.000Z"),
    })).toMatchObject({ tier: "free", status: "stale" });
  });
});
