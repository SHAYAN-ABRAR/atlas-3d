'use client';

import dynamic from 'next/dynamic';

// The studio is a fully client-side surface (WebGL, IndexedDB, pointer lock).
const Workspace = dynamic(() => import('@/components/workspace/workspace'), {
  ssr: false,
  loading: () => <div className="h-screen bg-bg" />,
});

export default function StudioPage() {
  return <Workspace />;
}
