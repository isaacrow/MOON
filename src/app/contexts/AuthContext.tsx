import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export interface AuthUser {
  username: string;
  email: string;
  institution: string;
  role: 'admin' | 'tester' | 'cataloger';
  status: 'pending' | 'approved' | 'rejected';
  registeredAt: string;
  approvedAt?: string;
  password?: string;
}

export interface LoginResult {
  success: boolean;
  message?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'unknown';
}

export interface SignupData {
  username: string;
  email: string;
  institution: string;
  password: string;
  inviteCode?: string;
}

export interface SignupResult {
  success: boolean;
  message?: string;
  status?: 'pending' | 'approved' | 'rejected';
}

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  user: AuthUser | null;
  accessToken: string | null;
  login: (identifier: string, password: string) => Promise<LoginResult>;
  signup: (data: SignupData | string, legacyPassword?: string) => Promise<SignupResult>;
  logout: () => void;
  // Approval Management
  getUsers: () => AuthUser[];
  approveUser: (usernameOrEmail: string) => boolean;
  rejectUser: (usernameOrEmail: string) => boolean;
  deleteUser: (usernameOrEmail: string) => boolean;
  pendingCount: number;
}

const STORAGE_USERS_KEY = 'moon_registered_users';
const STORAGE_AUTH_KEY = 'moon_auth';

export const SUPER_ADMIN: AuthUser = {
  username: 'isaac',
  email: 'isaac@moon.local',
  institution: 'Moon Library Architecture Core (Super Admin)',
  role: 'admin',
  status: 'approved',
  password: 'Eshak1996',
  registeredAt: new Date().toISOString(),
  approvedAt: new Date().toISOString(),
};

const INITIAL_USERS: AuthUser[] = [SUPER_ADMIN];

function loadStoredUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (raw) {
      let parsed: AuthUser[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Delete any old generic accounts ('admin', 'tester')
        parsed = parsed.filter(
          (u) => u.username.toLowerCase() !== 'admin' && u.username.toLowerCase() !== 'tester'
        );

        // Find or insert Super Admin isaac with password Eshak1996
        const isaacIdx = parsed.findIndex((u) => u.username.toLowerCase() === 'isaac');
        if (isaacIdx >= 0) {
          parsed[isaacIdx] = {
            ...parsed[isaacIdx],
            username: 'isaac',
            password: 'Eshak1996',
            role: 'admin',
            status: 'approved',
          };
        } else {
          parsed.unshift(SUPER_ADMIN);
        }

        try {
          localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(parsed));
        } catch {}
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to parse stored users:', err);
  }
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(INITIAL_USERS));
  } catch {}
  return INITIAL_USERS;
}

function saveStoredUsers(users: AuthUser[]) {
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Failed to save users to localStorage:', err);
  }
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<AuthUser[]>(loadStoredUsers);

  // Synchronize users from localStorage, fetch backend accounts, and restore session
  useEffect(() => {
    const allUsers = loadStoredUsers();
    setUsersList(allUsers);

    // Fetch accounts from backend server and reconcile
    const syncBackendAccounts = async () => {
      try {
        const res = await fetch('/api/accounts');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.accounts)) {
            let backendList: AuthUser[] = data.accounts.filter(
              (u: AuthUser) => u.username.toLowerCase() !== 'admin' && u.username.toLowerCase() !== 'tester'
            );
            const isaacIdx = backendList.findIndex((u) => u.username.toLowerCase() === 'isaac');
            if (isaacIdx >= 0) {
              backendList[isaacIdx] = {
                ...backendList[isaacIdx],
                username: 'isaac',
                password: 'Eshak1996',
                role: 'admin',
                status: 'approved',
              };
            } else {
              backendList.unshift(SUPER_ADMIN);
            }
            saveStoredUsers(backendList);
            setUsersList(backendList);
          }
        }
      } catch (err) {
        console.warn('Backend accounts sync failed (using local cache):', err);
      }
    };

    syncBackendAccounts();

    try {
      const savedAuth = localStorage.getItem(STORAGE_AUTH_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.username && parsed.accessToken) {
          const matched = allUsers.find(
            (u) => u.username.toLowerCase() === parsed.username.toLowerCase()
          );

          if (matched && matched.status === 'approved') {
            setIsAuthenticated(true);
            setUsername(matched.username);
            setUser(matched);
            setAccessToken(parsed.accessToken);
            return;
          } else if (!matched) {
            // Keep active session for backward compatibility
            setIsAuthenticated(true);
            setUsername(parsed.username);
            setUser({
              username: parsed.username,
              email: parsed.email || `${parsed.username}@moon.local`,
              institution: parsed.institution || 'Tester Institution',
              role: 'tester',
              status: 'approved',
              registeredAt: new Date().toISOString(),
            });
            setAccessToken(parsed.accessToken);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      localStorage.removeItem(STORAGE_AUTH_KEY);
    }
  }, []);

  const pendingCount = usersList.filter((u) => u.status === 'pending').length;

  const getUsers = useCallback((): AuthUser[] => {
    const refreshed = loadStoredUsers();
    setUsersList(refreshed);
    // Background refresh from backend
    fetch('/api/accounts')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.success && Array.isArray(data.accounts)) {
          const filtered = data.accounts.filter(
            (u: AuthUser) => u.username.toLowerCase() !== 'admin' && u.username.toLowerCase() !== 'tester'
          );
          saveStoredUsers(filtered);
          setUsersList(filtered);
        }
      })
      .catch(() => {});
    return refreshed;
  }, []);

  const approveUser = useCallback((usernameOrEmail: string): boolean => {
    const list = loadStoredUsers();
    const targetLower = usernameOrEmail.trim().toLowerCase();
    let updated = false;

    const nextList = list.map((u) => {
      if (u.username.toLowerCase() === targetLower || u.email.toLowerCase() === targetLower) {
        updated = true;
        return {
          ...u,
          status: 'approved' as const,
          approvedAt: new Date().toISOString(),
        };
      }
      return u;
    });

    if (updated) {
      saveStoredUsers(nextList);
      setUsersList(nextList);
      // Persist to backend
      fetch('/api/accounts/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetLower }),
      }).catch((e) => console.warn('Backend approveUser error:', e));
    }
    return updated;
  }, []);

  const rejectUser = useCallback((usernameOrEmail: string): boolean => {
    const list = loadStoredUsers();
    const targetLower = usernameOrEmail.trim().toLowerCase();
    let updated = false;

    const nextList = list.map((u) => {
      if (u.username.toLowerCase() === targetLower || u.email.toLowerCase() === targetLower) {
        updated = true;
        return {
          ...u,
          status: 'rejected' as const,
        };
      }
      return u;
    });

    if (updated) {
      saveStoredUsers(nextList);
      setUsersList(nextList);
      // Persist to backend
      fetch('/api/accounts/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetLower }),
      }).catch((e) => console.warn('Backend rejectUser error:', e));
    }
    return updated;
  }, []);

  const deleteUser = useCallback((usernameOrEmail: string): boolean => {
    const list = loadStoredUsers();
    const targetLower = usernameOrEmail.trim().toLowerCase();
    if (targetLower === 'isaac') {
      return false; // Cannot delete Super Admin
    }
    const nextList = list.filter(
      (u) => u.username.toLowerCase() !== targetLower && u.email.toLowerCase() !== targetLower
    );

    if (nextList.length !== list.length) {
      saveStoredUsers(nextList);
      setUsersList(nextList);
      // Persist to backend
      fetch('/api/accounts/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: targetLower }),
      }).catch((e) => console.warn('Backend deleteUser error:', e));
      return true;
    }
    return false;
  }, []);

  const login = async (identifier: string, inputPassword: string): Promise<LoginResult> => {
    const cleanId = identifier.trim().toLowerCase();

    // Check if identifier is the exclusive Super Admin (isaac)
    if (cleanId === 'isaac' || cleanId === 'isaac@moon.local') {
      if (inputPassword !== 'Eshak1996') {
        return {
          success: false,
          message: 'Invalid password for Super Admin account.',
        };
      }

      const token = `moon_super_admin_jwt_${Date.now()}`;
      const superAdminUser = SUPER_ADMIN;
      const authData = {
        username: 'isaac',
        email: superAdminUser.email,
        institution: superAdminUser.institution,
        role: 'admin' as const,
        accessToken: token,
      };

      setIsAuthenticated(true);
      setUsername('isaac');
      setUser(superAdminUser);
      setAccessToken(token);

      try {
        localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(authData));
      } catch (e) {
        console.error('Session persist error:', e);
      }

      return {
        success: true,
        status: 'approved',
        message: 'Welcome Isaac Faleh (Super Administrator)!',
      };
    }

    // Try refreshing users from backend first to get up-to-date approval status
    let list = loadStoredUsers();
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.accounts)) {
          list = data.accounts;
          saveStoredUsers(list);
          setUsersList(list);
        }
      }
    } catch {}

    // Check if identifier is the exclusive Super Admin (isaac)
    if (cleanId === 'isaac' || cleanId === 'isaac@moon.local') {
      if (inputPassword !== 'Eshak1996') {
        return {
          success: false,
          message: 'Invalid password for Super Admin account.',
        };
      }

      const token = `moon_super_admin_jwt_${Date.now()}`;
      const superAdminUser = list.find((u) => u.username.toLowerCase() === 'isaac') || SUPER_ADMIN;
      const authData = {
        username: 'isaac',
        email: superAdminUser.email,
        institution: superAdminUser.institution,
        role: 'admin' as const,
        accessToken: token,
      };

      setIsAuthenticated(true);
      setUsername('isaac');
      setUser(superAdminUser);
      setAccessToken(token);

      try {
        localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(authData));
      } catch (e) {
        console.error('Session persist error:', e);
      }

      return {
        success: true,
        status: 'approved',
        message: 'Welcome Isaac Faleh (Super Administrator)!',
      };
    }

    // Find in tester accounts
    const matched = list.find(
      (u) => u.username.toLowerCase() === cleanId || u.email.toLowerCase() === cleanId
    );

    if (matched) {
      // Validate tester password
      if (matched.password && matched.password !== inputPassword) {
        return {
          success: false,
          message: 'Invalid password. Please check your credentials.',
          status: matched.status,
        };
      }

      // Check approval status
      if (matched.status === 'pending') {
        return {
          success: false,
          status: 'pending',
          message: `Account for "${matched.username}" is pending approval by Super Administrator Isaac Faleh. Once approved, you will be able to sign in.`,
        };
      }

      if (matched.status === 'rejected') {
        return {
          success: false,
          status: 'rejected',
          message: `Tester access request for "${matched.username}" was declined by Super Administrator Isaac Faleh.`,
        };
      }

      // Approved tester! Set session
      const token = `moon_jwt_${Date.now()}_${Math.random().toString(36).substring(2)}`;
      const authData = {
        username: matched.username,
        email: matched.email,
        institution: matched.institution,
        role: matched.role,
        accessToken: token,
      };

      setIsAuthenticated(true);
      setUsername(matched.username);
      setUser(matched);
      setAccessToken(token);

      try {
        localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify(authData));
      } catch (e) {
        console.error('Session persist error:', e);
      }

      return {
        success: true,
        status: 'approved',
        message: `Welcome ${matched.username} from ${matched.institution || 'Tester Group'}!`,
      };
    }

    return {
      success: false,
      status: 'unknown',
      message: 'Account not found. Please register under the "Request Access" tab.',
    };
  };

  const signup = async (
    dataOrUsername: SignupData | string,
    legacyPassword?: string
  ): Promise<SignupResult> => {
    let usernameVal = '';
    let emailVal = '';
    let institutionVal = '';
    let passwordVal = '';
    let inviteCodeVal = '';

    if (typeof dataOrUsername === 'string') {
      usernameVal = dataOrUsername.trim();
      passwordVal = legacyPassword || '';
      emailVal = `${usernameVal}@moon.local`;
      institutionVal = 'Tester Institution';
    } else {
      usernameVal = dataOrUsername.username.trim();
      emailVal = dataOrUsername.email.trim();
      institutionVal = dataOrUsername.institution.trim();
      passwordVal = dataOrUsername.password;
      inviteCodeVal = (dataOrUsername.inviteCode || '').trim();
    }

    if (!usernameVal) {
      return { success: false, message: 'Username is required.' };
    }
    if (!emailVal || !emailVal.includes('@')) {
      return { success: false, message: 'A valid email address is required.' };
    }
    if (!institutionVal) {
      return { success: false, message: 'Institution or Organization is required.' };
    }
    if (passwordVal.length < 6) {
      return { success: false, message: 'Password must be at least 6 characters.' };
    }

    const currentList = loadStoredUsers();

    // Check duplicate
    const exists = currentList.find(
      (u) =>
        u.username.toLowerCase() === usernameVal.toLowerCase() ||
        u.email.toLowerCase() === emailVal.toLowerCase()
    );

    if (exists) {
      return {
        success: false,
        message: 'A tester with this username or email already exists.',
      };
    }

    // Determine status: If VIP code provided, auto-approve; otherwise requires Isaac's approval!
    const cleanInvite = inviteCodeVal.trim().toLowerCase().replace(/[\s\-_]/g, '');
    const isVip =
      cleanInvite === 'wolfmoonalqamiisaac' ||
      cleanInvite === 'moon2026' ||
      cleanInvite === 'isaac' ||
      cleanInvite === 'vip';

    const status: 'pending' | 'approved' = isVip ? 'approved' : 'pending';

    const newUser: AuthUser = {
      username: usernameVal,
      email: emailVal,
      institution: institutionVal,
      role: 'tester',
      status,
      password: passwordVal,
      registeredAt: new Date().toISOString(),
      ...(isVip ? { approvedAt: new Date().toISOString() } : {}),
    };

    const nextList = [newUser, ...currentList];
    saveStoredUsers(nextList);
    setUsersList(nextList);

    // Persist tester account to backend folio-sync-store
    try {
      await fetch('/api/accounts/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameVal,
          email: emailVal,
          institution: institutionVal,
          password: passwordVal,
          inviteCode: inviteCodeVal,
        }),
      });
    } catch (e) {
      console.warn('Backend register sync error:', e);
    }

    if (status === 'approved') {
      return {
        success: true,
        status: 'approved',
        message: 'Account approved with VIP code! You can now log in immediately.',
      };
    }

    return {
      success: true,
      status: 'pending',
      message: `Request received for ${usernameVal} (${institutionVal}). Your account is pending administrator approval (Isaac Faleh). You will be notified once approved.`,
    };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    setUser(null);
    setAccessToken(null);
    try {
      localStorage.removeItem(STORAGE_AUTH_KEY);
      console.log('Session cleared');
    } catch (error) {
      console.error('Error clearing session:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        username,
        user,
        accessToken,
        login,
        signup,
        logout,
        getUsers,
        approveUser,
        rejectUser,
        deleteUser,
        pendingCount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
