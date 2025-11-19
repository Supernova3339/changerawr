import {NextResponse} from 'next/server'
import type {NextRequest} from 'next/server'
import {verifyAccessToken} from '@/lib/auth/tokens'
import {getAppDomain} from '@/lib/custom-domains/utils'

const ALWAYS_PUBLIC_PATHS = [
    '/_next/',
    '/favicon.ico',
    '/public/',
    '/static/',
    '/_chrverify/',
    '/changerawr-domain-verification/',
    '/widget.css',
    '/widget-bundle.js'
]

const PUBLIC_API_PATHS = [
    '/api/auth/',
    '/api/setup/',
    '/api/check-setup',
    '/api/auth/oauth/',
]

const AUTH_ROUTES = ['/login', '/register', '/setup']

const PUBLIC_CONTENT_PATHS = [
    '/reset-password/',
    '/changelog/',
    '/unsubscribed',
    '/experiments/',
    '/forgot-password',
    '/two-factor',
    '/cli/auth',
]

function isAlwaysPublicPath(pathname: string): boolean {
    return ALWAYS_PUBLIC_PATHS.some(path => pathname.startsWith(path)) ||
        pathname.includes('.')
}

function isPublicApiPath(pathname: string): boolean {
    return PUBLIC_API_PATHS.some(path => pathname.startsWith(path))
}

function isPublicContentPath(pathname: string): boolean {
    return PUBLIC_CONTENT_PATHS.some(path => pathname.startsWith(path))
}

function isCustomDomain(hostname: string): boolean {
    try {
        const appDomain = getAppDomain()

        if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
            return false
        }

        return hostname !== appDomain && !hostname.endsWith(`.${appDomain}`)
    } catch {
        return false
    }
}

function handleCustomDomain(request: NextRequest, hostname: string, pathname: string): NextResponse {
    const url = request.nextUrl.clone()
    url.pathname = `/changelog/custom-domain/${encodeURIComponent(hostname)}${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
}

async function isSetupComplete(): Promise<boolean> {
    const headers = new Headers({'x-middleware-check': 'true'})
    try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        const response = await fetch(`${baseUrl}/api/check-setup`, {headers})
        if (!response.ok) return false
        const data = await response.json()
        return !!data.isComplete
    } catch {
        return false
    }
}

export async function proxy(request: NextRequest) {
    const {pathname} = request.nextUrl
    const hostname = request.headers.get('host') || ''

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const isApiRequest = pathname.startsWith('/api/')

    if (isCustomDomain(hostname) && pathname === '/rss.xml') {
        const url = request.nextUrl.clone()
        url.pathname = `/changelog/custom-domain/${encodeURIComponent(hostname)}/rss.xml`
        return NextResponse.rewrite(url)
    }

    if (isAlwaysPublicPath(pathname)) {
        return NextResponse.next()
    }

    if (isCustomDomain(hostname)) {
        if (pathname.startsWith('/api/')) {
            if (pathname.startsWith('/api/changelog/')) {
                return NextResponse.next()
            }
            return new NextResponse(null, {status: 404})
        }

        if (pathname === '/rss.xml') {
            const url = request.nextUrl.clone()
            url.pathname = `/changelog/custom-domain/${encodeURIComponent(hostname)}/rss.xml`
            return NextResponse.rewrite(url)
        }

        return handleCustomDomain(request, hostname, pathname)
    }

    if (pathname === '/api/check-setup') {
        return NextResponse.next()
    }

    if (isPublicApiPath(pathname)) {
        return NextResponse.next()
    }

    if (pathname.startsWith('/api/')) {
        return NextResponse.next()
    }

    if (isPublicContentPath(pathname)) {
        return NextResponse.next()
    }

    if (pathname === '/setup') {
        const setupComplete = await isSetupComplete()
        if (setupComplete) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return NextResponse.next()
    }

    const setupComplete = await isSetupComplete()
    if (!setupComplete) {
        return NextResponse.redirect(new URL('/setup', request.url))
    }

    const accessToken = request.cookies.get('accessToken')?.value
    const refreshToken = request.cookies.get('refreshToken')?.value

    if (AUTH_ROUTES.some(route => pathname.startsWith(route))) {
        if (accessToken) {
            try {
                const userId = await verifyAccessToken(accessToken)
                if (userId) {
                    return NextResponse.redirect(new URL('/dashboard', request.url))
                }
            } catch {
            }
        }
        return NextResponse.next()
    }

    if (!accessToken) {
        if (refreshToken) {
            return NextResponse.next()
        }
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }

    try {
        const userId = await verifyAccessToken(accessToken)
        if (!userId) {
            if (refreshToken) {
                return NextResponse.next()
            }
            const url = new URL('/login', request.url)
            url.searchParams.set('from', pathname)
            return NextResponse.redirect(url)
        }

        const response = NextResponse.next()
        response.headers.set('x-user-id', userId)
        return response
    } catch {
        if (refreshToken) {
            return NextResponse.next()
        }
        const url = new URL('/login', request.url)
        url.searchParams.set('from', pathname)
        return NextResponse.redirect(url)
    }
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}