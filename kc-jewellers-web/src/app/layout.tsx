import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KC Jewellers',
  description: 'Jewellery catalogue'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full antialiased text-slate-900 bg-slate-50">{children}</body>
    </html>
  );
}
