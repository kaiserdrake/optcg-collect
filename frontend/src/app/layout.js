import { Providers } from './providers';
import { AuthProvider } from '@/context/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata = {
  title: 'OPTCG Manager',
  description: 'Manage your One Piece TCG collection',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <Providers>
            <AuthProvider>
              {children}
            </AuthProvider>
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  )
}
