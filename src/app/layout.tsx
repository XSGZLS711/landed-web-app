import './globals.css';
import './landed.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Landed ✈',
  description: 'Find your dream job',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}