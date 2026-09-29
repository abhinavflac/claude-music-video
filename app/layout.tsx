import type { ReactNode } from 'react';

export const metadata = {
  title: 'Lossless',
  description: 'A music video about refusing to be compressed. Every frame is JavaScript; tap to restyle it live.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
