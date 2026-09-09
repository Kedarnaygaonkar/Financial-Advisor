import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Financial OS — Personal Finance Advisor',
  description:
    'Your intelligent AI-powered financial advisor for budgeting, investments, tax planning, and retirement. India-first personal finance management.',
  keywords: 'personal finance, investment tracker, tax planning, AI financial advisor, India',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased`}>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
