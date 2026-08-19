// Fonte única da regra de imagem de item: tamanho máximo, tipos aceitos e a
// detecção por assinatura (magic bytes). Servidor e cliente importam daqui para
// nunca divergirem. O content-type declarado pelo cliente NÃO é confiável — o
// tipo real vem sempre da assinatura do arquivo.

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_SIZE_LABEL = "5 MB";

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp"
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

// Rótulo curto usado nas mensagens ao usuário (picker, ajuda e erros).
export const ALLOWED_IMAGE_LABEL = "JPEG, PNG ou WebP";

// String pronta para o atributo `accept` de <input type="file">.
export const IMAGE_ACCEPT_ATTR = ALLOWED_IMAGE_MIME_TYPES.join(",");

const EXT_BY_MIME: Record<AllowedImageMimeType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

export function imageExtensionFor(mime: AllowedImageMimeType): string {
  return EXT_BY_MIME[mime];
}

// Verificação leve para o cliente (aviso imediato antes do upload). O
// content-type do browser pode faltar ou mentir, então tratamos tipo vazio como
// "não sei" — quem decide de verdade é a detecção por magic bytes no servidor.
export function isAllowedImageType(type: string): boolean {
  return (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

export function detectImageMimeType(
  buf: Buffer | Uint8Array
): AllowedImageMimeType | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 && // RIFF
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50 // WEBP
  ) {
    return "image/webp";
  }
  return null;
}
