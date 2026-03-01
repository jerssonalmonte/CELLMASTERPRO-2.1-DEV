import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import type { AppRole, Profile, Tenant } from '@/types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  tenant: Tenant | null;
  role: AppRole;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [role, setRole] = useState<AppRole>('staff');
  const [loading, setLoading] = useState(true);

  const fetchProfileAndRole = useCallback(async (userId: string) => {
    try {
      // Fetch profile first (needed for tenant_id)
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileData) {
        setProfile({
          id: profileData.id,
          user_id: profileData.user_id,
          tenant_id: profileData.tenant_id,
          full_name: profileData.full_name,
          first_name: profileData.first_name ?? undefined,
          last_name: profileData.last_name ?? undefined,
          username: profileData.username ?? undefined,
          phone: profileData.phone ?? undefined,
        });

        // Fetch tenant and roles in parallel — both only need tenant_id
        const [tenantResult, roleResult] = await Promise.all([
          supabase
            .from('tenants')
            .select('*')
            .eq('id', profileData.tenant_id)
            .single(),
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .eq('tenant_id', profileData.tenant_id),
        ]);

        if (tenantResult.data) {
          const tenantData = tenantResult.data;
          setTenant({
            id: tenantData.id,
            name: tenantData.name,
            slug: tenantData.slug,
            blocked_at: tenantData.blocked_at,
            created_at: tenantData.created_at,
            warranty_text: tenantData.warranty_text ?? undefined,
            logo_url: (tenantData as any).logo_url ?? undefined,
            subscription_status: (tenantData as any).subscription_status ?? undefined,
            subscription_plan: (tenantData as any).subscription_plan ?? undefined,
            monthly_fee: (tenantData as any).monthly_fee ?? undefined,
            next_due_date: (tenantData as any).next_due_date ?? undefined,
          });
        }

        if (roleResult.data && roleResult.data.length > 0) {
          const priority: AppRole[] = ['super_admin', 'admin', 'manager', 'staff', 'technician'];
          const bestRole = priority.find((r) => roleResult.data!.some((ur) => ur.role === r)) || 'staff';
          setRole(bestRole);
        }
      }
    } catch (err) {
      console.error('Error fetching profile/role:', err);
    }
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (newSession?.user) {
        // Use setTimeout to avoid Supabase client deadlock
        setTimeout(() => fetchProfileAndRole(newSession.user.id), 0);
      } else {
        setProfile(null);
        setTenant(null);
        setRole('staff');
      }
      setLoading(false);
    });

    // Then get initial session
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        fetchProfileAndRole(initialSession.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileAndRole]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) throw new Error(error.message);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTenant(null);
    setRole('staff');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        tenant,
        role,
        loading,
        signIn,
        signUp,
        signOut,
        isAuthenticated: !!session,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
