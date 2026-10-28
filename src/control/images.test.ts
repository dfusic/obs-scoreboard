import { describe, expect, it } from "vitest";
import { nameFromFileName } from "./images";

describe("nameFromFileName", () => {
  it("turns separators into spaces and capitalizes each word", () => {
    expect(nameFromFileName("ivan_horvat-final.png")).toBe("Ivan Horvat Final");
    expect(nameFromFileName("luka.modric.PNG")).toBe("Luka Modric");
  });
  it("keeps letters outside ASCII and capitalizes them", () => {
    expect(nameFromFileName("šime_vrsaljko.png")).toBe("Šime Vrsaljko");
    expect(nameFromFileName("ivan perić.jpg")).toBe("Ivan Perić");
  });
  it("collapses repeated separators and trims", () => {
    expect(nameFromFileName("__ana  --  b__.png")).toBe("Ana B");
  });
  it("keeps upper-case words and numbers as they are", () => {
    expect(nameFromFileName("IMG_1234.jpg")).toBe("IMG 1234");
    expect(nameFromFileName("McDonald-sponsor.png")).toBe("McDonald Sponsor");
  });
  it("handles names without an extension and empty names", () => {
    expect(nameFromFileName("ana")).toBe("Ana");
    expect(nameFromFileName(".png")).toBe("");
    expect(nameFromFileName("")).toBe("");
  });
});
