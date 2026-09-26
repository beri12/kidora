import type { Metadata } from 'next';
import { Landing } from '@/features/landing/Landing';

export const metadata: Metadata = {
  title: 'Kidora — Learn. Play. Grow.',
  description: 'AI-powered gamified learning built to help every child learn through curiosity, play, and personalized education.',
};

export default function Home() {
  return <Landing />;
}
