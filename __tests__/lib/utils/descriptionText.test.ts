import { normalizeDescriptionText } from "@/app/lib/utils/descriptionText";

describe("normalizeDescriptionText", () => {
  it("decodes HTML entities and normalizes nbsp spacing", () => {
    const input = "Tom &amp; Jerry&nbsp;&nbsp;said &quot;hi&quot;.";
    expect(normalizeDescriptionText(input)).toBe('Tom & Jerry said "hi".');
  });

  it("strips HTML tags while keeping readable line breaks", () => {
    const input = "<p>Hello<br>World</p><script>alert('x')</script>";
    expect(normalizeDescriptionText(input)).toBe("Hello\nWorld\n\nalert('x')");
  });

  it("removes invisible characters and preserves long-text readability", () => {
    const input = "A\u200Bmazing\u2060 deal\u00A0today";
    expect(normalizeDescriptionText(input)).toBe("Amazing deal today");
  });
});
