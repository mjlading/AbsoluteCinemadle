import { describe, expect, it } from "vitest";

import { editDistance, normalizeTitle, rankSuggestions, titleMatches } from "./match";

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

describe("rankSuggestions", () => {
  const film = (title: string, voteCount: number) => ({ title, voteCount });

  it("puts titles starting with the typed text first, then word matches, each by votes", () => {
    const results = [
      film("Guf Ha-Neschamot - Die Halle der Seelen", 3),
      film("Live Free or Die Hard", 9000),
      film("Die Hart", 400),
      film("Die Hard", 12000),
      film("Die Hard 2", 6000),
    ];
    expect(rankSuggestions("die ha", results).map((f) => f.title)).toEqual([
      "Die Hard",
      "Die Hard 2",
      "Die Hart",
      "Live Free or Die Hard",
      "Guf Ha-Neschamot - Die Halle der Seelen",
    ]);
  });

  it("ignores a leading article and punctuation, as matching does", () => {
    const results = [film("Shining Through", 100), film("The Shining", 9000)];
    expect(rankSuggestions("the shin", results).map((f) => f.title)).toEqual(["The Shining", "Shining Through"]);
  });
});
