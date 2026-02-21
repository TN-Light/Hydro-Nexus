/**
 * Role-Based Access Control (RBAC) helper for API routes.
 *
 * Roles (hierarchical):
 *   admin    — Full access: manage users, devices, settings, delete data
 *   operator — Control devices, modify parameters, view all data
 *   viewer   — Read-only dashboard access, no device control
 *
 * Usage in API routes:
 *   import { requireRole, getUserFromRequest } from '@/lib/auth-roles'
 *
 *   export async function POST(request: NextRequest) {
 *     const authResult = requireRole(request, 'operator')
 *     if (authResult.error) return authResult.error
 *     const user = authResult.user
 *     // ... route logic
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export type UserRole = 'admin' | 'operator' | 'viewer' | 'user'

// Role hierarchy — higher index = more permissions
const ROLE_HIERARCHY: Record<string, number> = {
  viewer: 1,
  user: 1,    // 'user' is treated same as 'viewer' for backward compat
  operator: 2,
  admin: 3,
}

interface JWTPayload {
  userId: string
  username: string
  role: string
  iat?: number
  exp?: number
}

interface AuthSuccess {
  user: JWTPayload
  error: null
}

interface AuthFailure {
  user: null
  error: NextResponse
}

type AuthResult = AuthSuccess | AuthFailure

/**
 * Extract and verify the JWT from the request cookie.
 * Returns the decoded user payload or null.
 */
export function getUserFromRequest(request: NextRequest): JWTPayload | null {
  const token = request.cookies.get('qbm-hydronet-token')?.value

  if (!token) return null

  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('JWT_SECRET not configured')
      return null
    }

    const decoded = jwt.verify(token, secret) as JWTPayload
    return decoded
  } catch {
    return null
  }
}

/**
 * Require the request to be authenticated with at least the given role.
 *
 * @param request  - the NextRequest
 * @param minRole  - minimum role required ('viewer' | 'operator' | 'admin')
 * @returns        - { user, error: null } on success, { user: null, error: NextResponse } on failure
 */
export function requireRole(request: NextRequest, minRole: UserRole = 'viewer'): AuthResult {
  const user = getUserFromRequest(request)

  if (!user) {
    return {
      user: null,
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    }
  }

  const userLevel = ROLE_HIERARCHY[user.role] ?? 0
  const requiredLevel = ROLE_HIERARCHY[minRole] ?? 0

  if (userLevel < requiredLevel) {
    return {
      user: null,
      error: NextResponse.json(
        {
          error: 'Insufficient permissions',
          required: minRole,
          current: user.role,
        },
        { status: 403 }
      ),
    }
  }

  return { user, error: null }
}

/**
 * Check if a user role has at least the given permission level.
 */
export function hasRole(userRole: string, minRole: UserRole): boolean {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minRole] ?? 0)
}

/**
 * Admin-only shorthand.
 */
export function requireAdmin(request: NextRequest): AuthResult {
  return requireRole(request, 'admin')
}

/**
 * Operator-or-above shorthand.
 */
export function requireOperator(request: NextRequest): AuthResult {
  return requireRole(request, 'operator')
}
