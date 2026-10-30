/**
 * 🔐 PRODUCTION JWT AUTHENTICATION
 * Validates Supabase Auth tokens for protected endpoints.
 * 
 * Accepts Supabase Auth tokens only and resolves user permissions from the
 * server-side MOON user store.
 */

import { createClient } from "jsr:@supabase/supabase-js@2";
import { Context } from "npm:hono";
import * as multiTenant from "./multiTenant.tsx";

export interface JWTPayload {
  sub: string;           // User ID
  email?: string;
  role?: string;
  exp?: number;          // Expiration timestamp
  iat?: number;          // Issued at timestamp
  aud?: string;          // Audience
  iss?: string;          // Issuer
  institutionId?: string;
  roles?: string[];
  permissions?: string[];
}

/**
 * 🔑 EXTRACT AND VALIDATE JWT TOKEN
 * Works with both Supabase Auth and custom JWTs
 */
export async function extractAndValidateJWT(c: Context): Promise<{
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}> {
  try {
    // Get token from Authorization header
    const authHeader = c.req.header('Authorization');
    
    if (!authHeader) {
      return { valid: false, error: 'Missing Authorization header' };
    }

    // Extract Bearer token
    const tokenMatch = authHeader.match(/^Bearer (.+)$/);
    if (!tokenMatch) {
      return { valid: false, error: 'Invalid Authorization format. Expected: Bearer <token>' };
    }

    const token = tokenMatch[1];

    // Try Supabase Auth first
    const supabaseResult = await validateSupabaseToken(token);
    if (supabaseResult.valid) {
      return supabaseResult;
    }

    return { valid: false, error: 'Invalid or expired token' };
  } catch (error) {
    console.error('[JWT] Token validation error:', error);
    return { 
      valid: false, 
      error: `Token validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * 🔐 VALIDATE SUPABASE AUTH TOKEN
 */
async function validateSupabaseToken(token: string): Promise<{
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      return { valid: false, error: 'Supabase not configured' };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify token and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return { 
        valid: false, 
        error: error?.message || 'Invalid Supabase token' 
      };
    }

    // Extract role from user metadata or app_metadata
    const roles = user.app_metadata?.roles || user.user_metadata?.roles || [];
    const institutionId = user.app_metadata?.institutionId || user.user_metadata?.institutionId;

    const payload: JWTPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      institutionId,
      roles: Array.isArray(roles) ? roles : [roles].filter(Boolean),
      permissions: []
    };

    return { valid: true, payload };
  } catch (error) {
    console.error('[JWT] Supabase token validation error:', error);
    return { valid: false, error: 'Supabase validation failed' };
  }
}

/**
 * 🔐 PRODUCTION AUTHENTICATION MIDDLEWARE
 * Validates Supabase Auth tokens for protected endpoints.
 */
export async function requireJWTAuth(c: Context, next: () => Promise<void>) {
  try {
    // Try JWT first
    const jwtResult = await extractAndValidateJWT(c);

    if (jwtResult.valid && jwtResult.payload) {
      // Load full user from database using JWT sub (user ID)
      const moonUser = await multiTenant.getUser(jwtResult.payload.sub);

      if (!moonUser) {
        return c.json({ 
          error: 'User not found in MOON database',
          details: 'Valid JWT but user does not exist in MOON. Create user first.',
          userId: jwtResult.payload.sub
        }, 404);
      }

      // Attach user to context
      (c as any).user = {
        id: moonUser.id,
        email: moonUser.email,
        institutionId: moonUser.institutionId,
        roles: moonUser.roles,
        permissions: moonUser.permissions,
        jwtPayload: jwtResult.payload
      };

      console.log(`[JWT AUTH] ✅ User ${moonUser.email} authenticated via JWT`);

      await next();
      return;
    }

    // No valid authentication method found
    return c.json({ 
      error: 'Unauthorized',
      message: 'Missing or invalid Supabase bearer token.',
      jwtError: jwtResult.error
    }, 401);

  } catch (error) {
    console.error('[JWT AUTH] Authentication error:', error);
    return c.json({ 
      error: 'Authentication failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500);
  }
}

/**
 * 🔄 REFRESH TOKEN ENDPOINT
 * For rotating access tokens
 */
export async function refreshToken(refreshToken: string): Promise<{
  success: boolean;
  accessToken?: string;
  expiresAt?: number;
  error?: string;
}> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Supabase not configured' };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error || !data.session) {
      return { 
        success: false, 
        error: error?.message || 'Failed to refresh token' 
      };
    }

    return {
      success: true,
      accessToken: data.session.access_token,
      expiresAt: data.session.expires_at
    };
  } catch (error) {
    console.error('[JWT] Token refresh error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 🔓 OAUTH2 INTEGRATION HELPERS
 */
export async function initiateOAuth(provider: 'google' | 'github' | 'azure'): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      return { success: false, error: 'Supabase not configured' };
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${supabaseUrl}/functions/v1/make-server-49c0e13c/auth/callback`
      }
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, url: data.url };
  } catch (error) {
    console.error('[JWT] OAuth initiation error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * 📊 TOKEN INTROSPECTION
 * Get information about a token without validating it
 */
export function inspectToken(token: string): {
  valid: boolean;
  payload?: any;
  header?: any;
  error?: string;
} {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid JWT format' };
    }

    // Decode header
    const headerBase64 = parts[0];
    const headerJson = atob(headerBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const header = JSON.parse(headerJson);

    // Decode payload
    const payloadBase64 = parts[1];
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);

    return {
      valid: true,
      header,
      payload
    };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Failed to decode token'
    };
  }
}
