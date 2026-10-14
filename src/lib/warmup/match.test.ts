import { describe, expect, it } from "vitest";

import { editDistance, normalizeTitle, titleMatches } from "./match";

describe("normalizeTitle", () => {
  it("ignores case, accents, punctuation and a leading article", () => {
    expect(normalizeTitle("The Silence of the Lambs")).toBe("silence of the lambs");
    expect(normalizeTitle("Amélie")).toBe("amelie");
    expect(normalizeTitle("Schindler’s List")).toBe("schindlers list");
    expect(normalizeTitle("Star Wars: Episode IV - A New Hope")).toBe("star wars episode iv a new hope");
    expect(normalizeTitle("Lock, Stock & Two Smoking Barrels")).toBe("lock stock and two smoking barrels");
    expect(normalizeTitle("A Clockwork Orange")).toBe("clockwork orange");
  });
});

describe("editDistance", () => {
  it("counts swaps of neighbouring letters as one edit", () => {
    expect(editDistance("grease", "graese")).toBe(1);
    expect(editDistance("kitten", "sitting")).toBe(3);
    expect(editDistance("", "abc")).toBe(3);
  });
});

describe("titleMatches", () => {
  it("accepts small typos on longer titles", () => {
    expect(titleMatches("die hrad", ["Die Hard"])).toBe(true);
    expect(titleMatches("die harder", ["Die Hard"])).toBe(false);
    expect(titleMatches("silence of the lams", ["The Silence of the Lambs"])).toBe(true);
    expect(titleMatches("back to the futrue", ["Back to the Future"])).toBe(true);
  });

  it("is strict on short titles and sequel numbers, where one character is another film", () => {
    expect(titleMatches("Up", ["Up"])).toBe(true);
    expect(titleMatches("Us", ["Up"])).toBe(false);
    expect(titleMatches("Alien", ["Aliens"])).toBe(false);
    expect(titleMatches("Jaws 2", ["Jaws"])).toBe(false);
    expect(titleMatches("Toy Story 3", ["Toy Story 2"])).toBe(false);
    expect(titleMatches("Rocky II", ["Rocky III"])).toBe(false);
    expect(titleMatches("toy story 2", ["Toy Story 2"])).toBe(true);
  });

  it("accepts any of the given answers and rejects blanks", () => {
    expect(titleMatches("Le Fabuleux Destin d'Amélie Poulain", ["Amélie", "Le Fabuleux Destin d'Amélie Poulain"])).toBe(
      true,
    );
    expect(titleMatches("   ", ["Up"])).toBe(false);
    expect(titleMatches("anything", [null])).toBe(false);
  });
});
