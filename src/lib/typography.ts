/**
 * Typographie française : espace insécable avant « : ; ? ! » et à l'intérieur des guillemets,
 * pour éviter qu'un signe se retrouve seul en début de ligne. Ne s'applique jamais au code.
 */
export function frenchSpacing(text: string) {
  return text
    .replace(/« /g, "« ")
    .replace(/ »/g, " »")
    .replace(/ ([:;?!])(?=\s|$)/g, " $1");
}
