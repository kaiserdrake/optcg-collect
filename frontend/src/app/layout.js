import { Providers } from './providers';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'OPTCG Manager',
  description: 'Manage your One Piece TCG collection',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AuthProvider>
            {children}
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}
