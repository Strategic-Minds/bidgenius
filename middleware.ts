import { NextRequest, NextResponse } from 'next/server'

async function digest(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')
}

function challenge(status = 401, message = 'Authentication required') {
  return new NextResponse(message, {
    status,
    headers: {
      'WWW-Authenticate': 'Basic realm="BidGenius Admin", charset="UTF-8"',
      'Cache-Control': 'no-store'
    }
  })
}

export async function middleware(req: NextRequest) {
  if (process.env.ADMIN_UI_AUTH_ENABLED !== 'true') return NextResponse.next()

  const expectedUser = process.env.ADMIN_UI_AUTH_USER || ''
  const expectedPassword = process.env.ADMIN_UI_AUTH_PASSWORD || ''
  if (!expectedUser || !expectedPassword) {
    return challenge(503, 'Admin authentication is enabled but not configured')
  }

  const authorization = req.headers.get('authorization') || ''
  if (!authorization.startsWith('Basic ')) return challenge()

  try {
    const decoded = atob(authorization.slice(6))
    const separator = decoded.indexOf(':')
    if (separator < 1) return challenge()
    const suppliedUser = decoded.slice(0, separator)
    const suppliedPassword = decoded.slice(separator + 1)
    const [suppliedHash, expectedHash] = await Promise.all([
      digest(`${suppliedUser}\u0000${suppliedPassword}`),
      digest(`${expectedUser}\u0000${expectedPassword}`)
    ])
    if (suppliedHash !== expectedHash) return challenge()
    return NextResponse.next()
  } catch {
    return challenge()
  }
}

export const config = {
  matcher: ['/((?!api/|_next/|icons/|manifest.json|sw.js|offline|favicon.ico).*)']
}
