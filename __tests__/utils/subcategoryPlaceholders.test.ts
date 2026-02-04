import {
  getCategoryLabelFromBusiness,
  getSubcategoryPlaceholder,
  getSubcategoryPlaceholderFromCandidates,
} from "@/app/utils/subcategoryPlaceholders";

describe("getCategoryLabelFromBusiness", () => {
  it("prefers sub_interest_id when present", () => {
    expect(
      getCategoryLabelFromBusiness({
        sub_interest_id: "museums",
        category: "miscellaneous",
      }),
    ).toBe("Museums");
  });

  it("maps category slug to display label when no slug fields exist", () => {
    expect(
      getCategoryLabelFromBusiness({
        category: "museums",
      }),
    ).toBe("Museums");
  });

  it("preserves category label when it is not a known slug", () => {
    expect(
      getCategoryLabelFromBusiness({
        category: "Food & Drink",
      }),
    ).toBe("Food & Drink");
  });

  it("returns Miscellaneous when all category fields are missing", () => {
    expect(getCategoryLabelFromBusiness({})).toBe("Miscellaneous");
  });

  it("returns Miscellaneous for the miscellaneous slug", () => {
    expect(
      getCategoryLabelFromBusiness({
        category: "miscellaneous",
      }),
    ).toBe("Miscellaneous");
  });
});

describe("subcategory placeholder resolution", () => {
  it("maps interest ids to a representative subcategory placeholder", () => {
    expect(getSubcategoryPlaceholderFromCandidates(["food-drink"])).toBe(
      "/businessImagePlaceholders/food-drink/restaurants.jpg",
    );
  });

  it("maps canonical labels to placeholders", () => {
    expect(getSubcategoryPlaceholder("Museums")).toBe(
      "/businessImagePlaceholders/arts-culture/museums.jpg",
    );
  });

  it("maps alias slugs to placeholders", () => {
    expect(getSubcategoryPlaceholder("museum")).toBe(
      "/businessImagePlaceholders/arts-culture/museums.jpg",
    );
  });
});
