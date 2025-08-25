import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  triggerTaskNotifications: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationTrigger, setNotificationTrigger] = useState(0);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        const wasSignedOut = !user && session?.user;
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Trigger task notifications on successful login
        if (event === 'SIGNED_IN' || wasSignedOut) {
          setTimeout(() => {
            setNotificationTrigger(prev => prev + 1);
          }, 1000); // Small delay to ensure everything is loaded
        }
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const triggerTaskNotifications = () => {
    setNotificationTrigger(prev => prev + 1);
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    triggerTaskNotifications,
    notificationTrigger,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};