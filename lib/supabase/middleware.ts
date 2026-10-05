import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/offline"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    }
  );

  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!data.user && !isPublicPath) {
    return redirectPreservingCookies(request, response, "/login");
  }

  if (data.user) {
    // Verificación en dos pasos: si el usuario tiene un factor TOTP (nextLevel aal2) y esta
    // sesión solo pasó la contraseña (aal1), nada de la app es accesible hasta poner el código.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const needsMfa = aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2";

    if (needsMfa && pathname !== MFA_PATH && !pathname.startsWith("/offline")) {
      return redirectPreservingCookies(request, response, MFA_PATH);
    }
    if (!needsMfa && (pathname === "/login" || pathname === MFA_PATH)) {
      return redirectPreservingCookies(request, response, "/hoy");
    }
  }

  return response;
}

const MFA_PATH = "/login/verificar";

/** Redirige conservando las cookies que Supabase haya refrescado en esta misma petición. */
function redirectPreservingCookies(request: NextRequest, response: NextResponse, path: string) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  return redirect;
}
