import React, { createContext, useContext, useEffect, useState } from 'react';


export interface AuthContextType {
  user: any | null;
  loading: boolean;
  signUp: (data: RegisterData) => Promise<{ error: any; email?: string }>;
  signIn: (username: string, password: string) => Promise<{ error: any; user?: any; notVerified?: boolean; email?: string }>;
  signOut: () => Promise<void>;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  idCard: string;
  phone: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  dateOfBirth: { day: string; month: string; year: string };
  gender: string;
  notificationMethod: string;
  mobilePhone: string;
  province: string;
  district: string;
  sector: string;
  cell: string;
  village: string;
  profilePhoto?: File | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Try to restore session from token
    async function restore() {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch('http://localhost:5000/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!data.error && data.user) setUser(data.user);
      } catch (err) {
        // ignore
      }
      setLoading(false);
    }
    restore();
  }, []);

  const signUp = async (data: RegisterData): Promise<{ error: any; email?: string }> => {
    try {
      const formData = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (key === 'dateOfBirth' && typeof value === 'object') {
          formData.append('dateOfBirth[year]', value.year);
          formData.append('dateOfBirth[month]', value.month);
          formData.append('dateOfBirth[day]', value.day);
        } else if (key === 'profilePhoto' && value) {
          formData.append('profilePhoto', value as File);
        } else if (value !== undefined && value !== null) {
          formData.append(key, value as string);
        }
      });
      const res = await fetch('http://localhost:5000/auth/register', {
        method: 'POST',
        body: formData
      });
      const result = await res.json();
      if (result.error) {
        return { error: result.error };
      }
      // Return email for verification UI
      return { error: null, email: data.email };
    } catch (err) {
      return { error: 'Server error.' };
    }
  };

  const signIn = async (username: string, password: string): Promise<{ error: any; user?: any; notVerified?: boolean; email?: string }> => {
    try {
      const res = await fetch('http://localhost:5000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.notVerified) {
        return { error: data.error, notVerified: true, email: data.email };
      }
      if (data.error) {
        return { error: data.error };
      }
      localStorage.setItem('token', data.token);
      setUser(data.user);
      return { error: null, user: data.user };
    } catch (err) {
      return { error: 'Server error.' };
    }
  };

  const signOut = async () => {
    // Clear local session
    localStorage.removeItem('token');
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    loading,
    signUp,
    signIn,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
