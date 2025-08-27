'use client';
import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Spinner, Container } from '@chakra-ui/react';

export default function AdminGuard({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!user || user.role !== 'Admin')) {
            router.push('/'); // Redirect non-admins to the home page
        }
    }, [user, loading, router]);

    if (loading || !user || user.role !== 'Admin') {
        // Show a loading spinner while verifying
        return <Container centerContent mt={20}><Spinner size="xl" /></Container>;
    }

    // If user is an admin, render the page content
    return <>{children}</>;
}
