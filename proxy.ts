import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { isStaffDashboardRole, parseStaffSessionCookie, STAFF_SESSION_COOKIE } from "@/lib/staff-session"

function redirectToLogin(request: NextRequest, nextPath?: string) {
  const login = new URL("/login", request.url)
  if (nextPath) login.searchParams.set("next", nextPath)
  return NextResponse.redirect(login)
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const session = parseStaffSessionCookie(request.cookies.get(STAFF_SESSION_COOKIE)?.value)

  if (pathname.startsWith("/dashboard")) {
    if (!session?.token) {
      return redirectToLogin(request, pathname)
    }
    if (!isStaffDashboardRole(session.role)) {
      return redirectToLogin(request)
    }
    if (session.mustChangePin) {
      return redirectToLogin(request)
    }

    if (pathname.startsWith("/dashboard/admin") && session.role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    if (pathname.startsWith("/dashboard/manager") && session.role !== "manager") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    if (pathname.startsWith("/dashboard/comptable") && session.role !== "accountant") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }
    if (pathname.startsWith("/dashboard/reclamations-validation") && session.role === "accountant") {
      return NextResponse.redirect(new URL("/dashboard/comptable/reclamations", request.url))
    }

    return NextResponse.next()
  }

  if (pathname === "/login" && session?.token && !session.mustChangePin && isStaffDashboardRole(session.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname === "/" && session?.token && !session.mustChangePin && isStaffDashboardRole(session.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/", "/login", "/dashboard/:path*"],
}
