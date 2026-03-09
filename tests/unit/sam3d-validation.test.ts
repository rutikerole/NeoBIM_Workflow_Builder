import { describe, it, expect } from "vitest";
import { validateGN007Input, validateNodeInput, assertValidInput } from "@/lib/validation";

describe("GN-007: Image to 3D (SAM 3D) Validation", () => {
  it("should pass with a valid image URL", () => {
    const result = validateGN007Input({ imageUrl: "https://example.com/building.jpg" });
    expect(result.valid).toBe(true);
  });

  it("should pass with a valid url field", () => {
    const result = validateGN007Input({ url: "https://example.com/building.png" });
    expect(result.valid).toBe(true);
  });

  it("should pass with base64 image data", () => {
    const result = validateGN007Input({ imageBase64: "data:image/png;base64,iVBOR..." });
    expect(result.valid).toBe(true);
  });

  it("should pass with fileData field", () => {
    const result = validateGN007Input({ fileData: "data:image/jpeg;base64,/9j/..." });
    expect(result.valid).toBe(true);
  });

  it("should fail without any image", () => {
    const result = validateGN007Input({});
    expect(result.valid).toBe(false);
    expect(result.error).toContain("No image");
  });

  it("should fail with null input", () => {
    const result = validateGN007Input(null);
    expect(result.valid).toBe(false);
  });

  it("should fail with undefined input", () => {
    const result = validateGN007Input(undefined);
    expect(result.valid).toBe(false);
  });

  it("should be accessible via validateNodeInput", () => {
    const result = validateNodeInput("GN-007", { url: "https://example.com/img.jpg" });
    expect(result.valid).toBe(true);
  });

  it("should be accessible via validateNodeInput with no image", () => {
    const result = validateNodeInput("GN-007", {});
    expect(result.valid).toBe(false);
  });

  it("assertValidInput should throw for missing image", () => {
    expect(() => assertValidInput("GN-007", {})).toThrow();
  });

  it("assertValidInput should not throw for valid image", () => {
    expect(() => assertValidInput("GN-007", { url: "https://example.com/img.jpg" })).not.toThrow();
  });
});
