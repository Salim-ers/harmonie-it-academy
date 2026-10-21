import { describe, expect, it } from "vitest";
import { frenchSpacing } from "@/lib/typography";

describe("frenchSpacing", () => {
  it("rend insécables les espaces des guillemets et de la ponctuation haute", () => {
    expect(frenchSpacing("Il appelle : « Internet ne marche plus ! »")).toBe("Il appelle : « Internet ne marche plus ! »");
  });
  it("ne touche pas aux deux-points collés (heures, URL)", () => {
    expect(frenchSpacing("8:40 et https://exemple.fr")).toBe("8:40 et https://exemple.fr");
  });
});
