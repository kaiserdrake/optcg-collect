'use client';

import { createContext, useState, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    // Check if user is logged in on initial load
    useEffect(() => {
        const checkUserLoggedIn = async () => {
            try {
                const res = await fetch(`${api}/api/users/me`, { credentials: 'include' });
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                } else {
                    setUser(null);
                }
            } catch (error) {
                setUser(null);
            } finally {
                setLoading(false);
            }
        };
        checkUserLoggedIn();
    }, [api]);

    const login = async (username, password) => {
        try {
            const res = await fetch(`${api}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                //
                //  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
                //  <<<<<       THE FIX IS HERE        >>>>>
                //  <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
                //  We are sending 'usernameOrEmail' to match the backend
                //
                body: JSON.stringify({ usernameOrEmail: username, password }),
                //
                credentials: 'include',
            });

            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                router.push('/');
                return { success: true };
            } else {
                const errorData = await res.json();
                return { success: false, message: errorData.message };
            }
        } catch (error) {
            return { success: false, message: "Could not connect to server." };
        }
    };

    const logout = async () => {
        try {
            // Tell the backend to clear the HttpOnly cookie
            await fetch(`${api}/api/logout`, {
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
