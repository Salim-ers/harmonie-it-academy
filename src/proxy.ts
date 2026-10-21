import { NextResponse, type NextRequest } from "next/server";

/**
 * Redirection optimiste : sans cookie de session, inutile de rendre une page privée.
 * La vraie vérification (validité, rôle, MFA) est faite côté serveur dans chaque page et action.
 */
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.getAll().some((c) => c.name.endsWith("hia.session_token"));
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.search = `?suite=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/campus/:path*", "/studio/:path*", "/entreprise/:path*"] };
