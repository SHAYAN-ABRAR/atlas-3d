'use client';

import { Tabs } from '@/components/ui/tabs';
import { useUIStore, type RightTab } from '@/stores/ui-store';
import { Assistant } from './assistant';
import { Inspector } from './inspector';

export function RightPanel() {
  const tab = useUIStore((s) => s.rightTab);
  const set = useUIStore((s) => s.set);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-2">
        <Tabs<RightTab>
          layoutId="right-tabs"
          value={tab}
          onChange={(v) => set({ rightTab: v })}
          tabs={[
            { value: 'design', label: 'Design' },
            { value: 'assistant', label: 'Assistant' },
          ]}
        />
      </div>
      {tab === 'design' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Inspector />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <Assistant />
        </div>
      )}
    </div>
  );
}
