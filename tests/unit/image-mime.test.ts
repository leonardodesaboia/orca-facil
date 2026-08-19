import { describe, it, expect } from "vitest";

import {
  ALLOWED_IMAGE_LABEL,
  detectImageMimeType,
  imageExtensionFor,
  isAllowedImageType,
  MAX_IMAGE_SIZE_BYTES
} from "@/lib/image-mime";

function bytes(...b: number[]): Buffer {
  return Buffer.from(b);
}

describe("detectImageMimeType", () => {
  it("detecta JPEG pela assinatura", () => {
    expect(detectImageMimeType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe("image/jpeg");
  });

  it("detecta PNG pela assinatura", () => {
    expect(
      detectImageMimeType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    ).toBe("image/png");
  });

  it("detecta WebP (RIFF....WEBP)", () => {
    expect(
      detectImageMimeType(
        bytes(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50)
      )
    ).toBe("image/webp");
  });

  it("rejeita conteúdo que não é imagem", () => {
    expect(detectImageMimeType(bytes(0x00, 0x01, 0x02, 0x03))).toBeNull();
    expect(detectImageMimeType(bytes(0x25, 0x50, 0x44, 0x46))).toBeNull(); // %PDF
    // GIF não é aceito: assinatura reconhecível não deve virar tipo válido.
    expect(detectImageMimeType(bytes(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBeNull();
  });

  it("rejeita buffer curto demais para a assinatura", () => {
    expect(detectImageMimeType(bytes(0xff, 0xd8))).toBeNull();
  });
});

describe("imageExtensionFor", () => {
  it("mapeia cada tipo aceito para a extensão", () => {
    expect(imageExtensionFor("image/jpeg")).toBe("jpg");
    expect(imageExtensionFor("image/png")).toBe("png");
    expect(imageExtensionFor("image/webp")).toBe("webp");
  });
});

describe("isAllowedImageType", () => {
  it("aceita os tipos suportados e rejeita o resto", () => {
    expect(isAllowedImageType("image/jpeg")).toBe(true);
    expect(isAllowedImageType("image/webp")).toBe(true);
    expect(isAllowedImageType("image/gif")).toBe(false);
    expect(isAllowedImageType("image/heic")).toBe(false);
    expect(isAllowedImageType("")).toBe(false);
  });
});

describe("limites e rótulos", () => {
  it("limita a 5 MB", () => {
    expect(MAX_IMAGE_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it("descreve os formatos aceitos", () => {
    expect(ALLOWED_IMAGE_LABEL).toBe("JPEG, PNG ou WebP");
  });
});
