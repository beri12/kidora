import './globals.css';
import type { ReactNode } from 'react';
import { Baloo_2, Nunito } from 'next/font/google';
import { Providers } from '@/providers';

const baloo = Baloo_2({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-baloo' });
const nunito = Nunito({ subsets: ['latin'], weight: ['600', '700', '800', '900'], variable: '--font-nunito' });

export const metadata = { title: 'Kidora — Learn · Play · Grow', description: 'AI-powered learning ecosystem for children, parents, teachers, schools, and districts.' };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${baloo.variable} ${nunito.variable}`}>
      <body className="font-body">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
