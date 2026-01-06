import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, Admin, SuperAdmin } from '../lib/supabase';

type UserRole = 'super_admin' | 'admin' | null;

interface AuthContextType {
  user: User | null;
  userRole: UserRole;
  userRoles: string[];
  adminData: Admin | null;
  superAdminData: SuperAdmin | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [adminData, setAdminData] = useState<Admin | null>(null);
  const [superAdminData, setSuperAdminData] = useState<SuperAdmin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let checkCompleted = false;

    const timeoutId = setTimeout(() => {
      if (!checkCompleted) {
        setLoading(false);
      }
    }, 3000);

    checkUser().finally(() => {
      checkCompleted = true;
      clearTimeout(timeoutId);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadUserRole(session.user.id);
      } else {
        setUser(null);
        setUserRole(null);
        setAdminData(null);
        setSuperAdminData(null);
        setLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function checkUser() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Error getting session:', error);
        setLoading(false);
        return;
      }
      if (session?.user) {
        setUser(session.user);
        await loadUserRole(session.user.id);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setLoading(false);
    }
  }

  async function loadUserRole(userId: string) {
    try {
      const roles: string[] = [];

      const { data: superAdmin } = await supabase
        .from('super_admins')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (superAdmin) {
        roles.push('super_admin');
        setSuperAdminData(superAdmin);
      }

      const { data: admin } = await supabase
        .from('admins')
        .select('*, apartment:apartments(*)')
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();

      if (admin) {
        roles.push('admin');
        setAdminData(admin);
      }

      setUserRoles(roles);

      if (roles.length > 0) {
        setUserRole(roles.includes('super_admin') ? 'super_admin' : 'admin');
      } else {
        setUserRole(null);
        setAdminData(null);
        setSuperAdminData(null);
      }
    } catch (error) {
      console.error('Error loading user role:', error);
    } finally {
      setLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setUserRole(null);
    setUserRoles([]);
    setAdminData(null);
    setSuperAdminData(null);

    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  const value = {
    user,
    userRole,
    userRoles,
    adminData,
    superAdminData,
    loading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
