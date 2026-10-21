import { randomBytes } from "node:crypto";

/** Alphabet sans caractères ambigus (0/O, 1/I/L) : codes lisibles à l'oral et à l'écrit. */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomCode(length = 10): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function formatCode(code: string) {
  return code.replace(/(.{5})(?=.)/g, "$1-");
}
