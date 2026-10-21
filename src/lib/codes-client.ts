export function formatCode(code: string) {
  return code.replace(/(.{5})(?=.)/g, "$1-");
}
