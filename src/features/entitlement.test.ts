import { describe, expect, it } from "vitest";
import {
  freeEntitlement,
  getEntitlementLabel,
  getEntitlementTier,
  parseEntitlement,
} from "./entitlement";

describe("entitlement", () => {
  it("по умолчанию и при повреждённых данных выдаёт только Free", () => {
    expect(parseEntitlement(null)).toEqual(freeEntitlement);
    expect(parseEntitlement({ kind: "premium" })).toEqual(freeEntitlement);
    expect(getEntitlementTier(freeEntitlement)).toBe("free");
  });

  it("принимает активную проверенную подписку", () => {
    const entitlement = parseEntitlement({
      version: 1,
      kind: "premium",
      source: "app_store",
      expiresAt: "2026-08-22T12:00:00.000Z",
      verifiedAt: "2026-07-22T12:00:00.000Z",
      autoRenews: true,
    });

    expect(getEntitlementTier(
      entitlement,
      new Date("2026-07-22T12:00:00.000Z"),
    )).toBe("premium");
    expect(getEntitlementLabel(
      entitlement,
      new Date("2026-07-22T12:00:00.000Z"),
    )).toBe("Premium");
  });

  it("не оставляет Premium после истечения срока", () => {
    const entitlement = parseEntitlement({
      version: 1,
      kind: "temporary",
      source: "trial",
      expiresAt: "2026-07-21T12:00:00.000Z",
      verifiedAt: "2026-07-20T12:00:00.000Z",
      autoRenews: false,
    });

    expect(getEntitlementTier(
      entitlement,
      new Date("2026-07-22T12:00:00.000Z"),
    )).toBe("free");
  });

  it("отклоняет временный доступ без срока и источник none для Premium", () => {
    expect(parseEntitlement({
      version: 1,
      kind: "temporary",
      source: "trial",
      expiresAt: null,
      verifiedAt: "2026-07-22T12:00:00.000Z",
      autoRenews: false,
    })).toEqual(freeEntitlement);
    expect(parseEntitlement({
      version: 1,
      kind: "premium",
      source: "none",
      expiresAt: null,
      verifiedAt: null,
      autoRenews: false,
    })).toEqual(freeEntitlement);
  });

  it("не принимает непроверенное или противоречивое право", () => {
    expect(parseEntitlement({
      version: 1,
      kind: "premium",
      source: "web",
      expiresAt: null,
      verifiedAt: null,
      autoRenews: false,
    })).toEqual(freeEntitlement);
    expect(parseEntitlement({
      version: 1,
      kind: "temporary",
      source: "app_store",
      expiresAt: "2026-07-29T12:00:00.000Z",
      verifiedAt: "2026-07-22T12:00:00.000Z",
      autoRenews: false,
    })).toEqual(freeEntitlement);
  });
});
