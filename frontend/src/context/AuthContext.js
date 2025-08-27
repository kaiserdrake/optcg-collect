'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, getErrorMessage } from '../utils/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    // Check if user is logged in on initial load
    useEffect(() => {
        const checkUserLoggedIn = async () => {
            try {
                console.log('[Auth] Checking if user is logged in...');
                const userData = await api.users.me();
                console.log('[Auth] User is logged in:', userData);
                setUser(userData);
            } catch (error) {
                console.log('[Auth] User is not logged in:', error.message);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkUserLoggedIn();
    }, []);

    const login = async (username, password) => {
        try {
            console.log('[Auth] Attempting to log in...');
            const data = await api.login({ usernameOrEmail: username, password });
            console.log('[Auth] Login successful:', data);

            setUser(data.user);
            router.push('/');
            return { success: true };
        } catch (error) {
            console.error('[Auth] Login failed:', error);
            const message = getErrorMessage(error);
            return { success: false, message };
        }
    };

    const logout = async () => {
        try {
            console.log('[Auth] Logging out...');
            // Tell the backend to clear the HttpOnly cookie
            await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/logout`, {
                method: 'POST',
                credentials: 'include',
            });
        } catch (error) {
            console.error("Failed to logout from server:", error);
        } finally {
            // Always clear frontend state and redirect
            setUser(null);
            router.push('/login');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
