import type { Metadata } from 'next';
import { Manrope, Space_Grotesk } from 'next/font/google';
import '@/app/globals.css';
import { AppProvider } from '@/lib/app-state';

const manrope = Manrope({ subsets: ['latin'], variable: '--font-body' });
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'Mini-Jira',
  description: 'A lightweight team task-management workspace'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${manrope.variable} ${spaceGrotesk.variable}`}>
      <body>
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}