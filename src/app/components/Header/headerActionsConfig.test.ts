import {
  DISCOVER_LINKS,
  PRIMARY_LINKS,
  getAllNavLinksForRole,
} from "./headerActionsConfig";

describe("getAllNavLinksForRole", () => {
  it("returns business-only links for business accounts", () => {
    const nav = getAllNavLinksForRole(true, false, true);

    expect(nav.primaryLinks).toEqual([]);
    expect(nav.discoverLinks).toEqual([]);
    expect(nav.businessLinks.length).toBeGreaterThan(0);

    const blockedForBusiness = new Set([
      "/home",
      "/for-you",
      "/trending",
      "/explore",
      "/events-specials",
      "/saved",
      "/write-review",
      "/profile",
    ]);

    for (const link of nav.businessLinks) {
      expect(blockedForBusiness.has(link.href)).toBe(false);
    }
  });

  it("keeps personal/discover navigation for non-business users", () => {
    const nav = getAllNavLinksForRole(false, false, false);

    expect(nav.primaryLinks).toEqual(PRIMARY_LINKS);
    expect(nav.discoverLinks).toEqual(DISCOVER_LINKS);
    expect(nav.businessLinks).toEqual([]);
  });

  it("returns a safe subset while business ownership status is checking", () => {
    const nav = getAllNavLinksForRole(true, true, false);

    expect(nav.primaryLinks).toEqual([]);
    expect(nav.discoverLinks).toEqual([]);
    expect(nav.businessLinks.map((link) => link.href)).toEqual([
      "/my-businesses",
      "/claim-business",
    ]);
  });
});
