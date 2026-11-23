import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/unauthorized"];

const SESSION_COOKIE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/**
 * Lightweight edge-safe gate. It only checks that a session cookie exists so
 * that anonymous traffic never reaches application pages. Real authentication
 * and authorization happen server-side in layouts, pages and Server Actions.
 */
export default function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const hasSession = SESSION_COOKIE_NAMES.some((name) =>
    request.cookies.has(name),
  );

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );

  if (!hasSession && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
