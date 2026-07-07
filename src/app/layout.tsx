import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Atlas 3D — Transform any 2D map into an explorable 3D world',
  description:
    'Local-first procedural world building. Drop in a map, blueprint or sketch; get terrain, cities and atmosphere you can walk through — with a local AI co-designer.',
  applicationName: 'Atlas 3D',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#111113' },
    { media: '(prefers-color-scheme: light)', color: '#f6f5f2' },
  ],
};

/** Applies the persisted theme before first paint — no flash. */
const themeBoot = `(function(){try{var s=localStorage.getItem('atlas3d:ui');var t=s?JSON.parse(s).state.theme:'dark';document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBoot }} />
      </head>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
