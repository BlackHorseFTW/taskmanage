import { type NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Define which paths require authentication
const protectedPaths = [
  "/",
  "/tasks",
  "/admin"
];

// Define paths that require admin access
const adminPaths = [
  "/admin"
];

// Define auth paths (redirect if logged in)
const authPaths = [
  "/login",
  "/signup"
];

// Define paths that should never be affected by auth
const bypassPaths = [
  "/_next",
  "/favicon.ico",
  "/api",
  "/static"
];

// Simple loop detection function
function isRedirectLoop(request: NextRequest): boolean {
  // Check for and prevent redirect loops
  const redirectCount = parseInt(request.headers.get("x-redirect-count") ?? "0", 10);
  if (redirectCount > 2) {
    console.log("Too many redirects detected, bypassing auth check");
    return true;
  }
  
  // Check if there is a referer header and if it contains the current domain
  const referer = request.headers.get("referer") ?? "";
  const pathname = request.nextUrl.pathname;
  
  // If we're already on the login page, don't redirect to login again
  if (pathname === "/login" && referer.includes("/login")) {
    console.log("Detected login-to-login redirect loop, bypassing auth check");
    return true;
  }
  
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log("Middleware running for path:", pathname);
  
  // Check for bypass paths - no auth needed
  if (bypassPaths.some(path => pathname.startsWith(path))) {
    console.log("Bypassing auth check for path:", pathname);
    return NextResponse.next();
  }
  
  // Check for redirect loops
  if (isRedirectLoop(request)) {
    return NextResponse.next();
  }
  
  try {
    // Get auth cookie
    const hasAuthCookie = request.cookies.has("auth_session");
    console.log("Auth cookie present:", hasAuthCookie);
    
    // Special case: Never redirect from login/signup pages
    if (pathname === "/login" || pathname === "/signup") {
      console.log("On auth page, allowing access");
      return NextResponse.next();
    }
    
    // Check if path is protected and user is not logged in
    if (protectedPaths.some(path => pathname.startsWith(path)) && !hasAuthCookie) {
      console.log("Redirecting unauthenticated user to login");
      const response = NextResponse.redirect(new URL("/login", request.url));
      
      // Track the redirect to prevent loops
      response.headers.set("x-redirect-count", "1");
      return response;
    }
    
    // Check for admin paths - need to verify the user's role
    if (adminPaths.some(path => pathname.startsWith(path))) {
      // We can only check user role at the page component level since middleware
      // doesn't have access to database. The adminProcedure in the API will handle
      // validating admin access for data requests.
      console.log("Admin path detected:", pathname);
    }

    // Check if user is logged in and trying to access auth pages
    if (authPaths.includes(pathname) && hasAuthCookie) {
      console.log("Redirecting authenticated user to home");
      const response = NextResponse.redirect(new URL("/", request.url));
      
      // Track the redirect to prevent loops
      response.headers.set("x-redirect-count", "1");
      return response;
    }

    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    // Don't redirect on error to prevent loops
    return NextResponse.next();
  }
}

// Config for middleware
export const config = {
  matcher: [
    // Only run middleware on pages, not on API routes or static assets
    "/((?!api/|_next/|favicon.ico|static/).*)",
  ]
}; 