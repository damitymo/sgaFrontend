import type { Metadata } from 'next';
import './globals.css';
import { GlobalEnterNavigation } from '@/components/global-enter-navigation';
import { ThemeProvider } from '@/components/theme-provider';

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
    <html lang="es" suppressHydrationWarning>
      <body className="bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <ThemeProvider>
          <GlobalEnterNavigation />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}