import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env"

// Routes reachable without a session. Everything else redirects to /login.
const PUBLIC_PATHS = ["/login", "/auth"]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        // Written twice on purpose: once onto the request so anything later in
        // this same pass sees the refreshed session, and once onto a rebuilt
        // response so the browser actually receives the Set-Cookie headers.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser(), not getSession(). getSession() trusts the cookie as-is; getUser()
  // revalidates it against the Supabase auth server, so a tampered or expired
  // cookie cannot pass as a live session. This call is also what triggers the
  // token refresh that keeps a logged-in phone from being logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p))

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  // Must return this exact response object. Building a fresh NextResponse here
  // would drop the refreshed auth cookies and log the user out on every request.
  return response
}
