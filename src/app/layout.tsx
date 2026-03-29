import type { Metadata } from 'next';
import './globals.css';
import { GlobalEnterNavigation } from '@/components/global-enter-navigation';

export const metadata: Metadata = {
  title: 'SGA',
  description: 'Sistema de Gestión Administrativa',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <GlobalEnterNavigation />
        {children}
      </body>
    </html>
  );
}