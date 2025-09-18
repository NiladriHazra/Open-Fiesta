'use client';
import { useState } from 'react';
import AIChatBox from '@/components/chat/AIChatBox';

type Props = {
  onSubmit: (text: string, imageDataUrl?: string) => void;
  loading: boolean;
};

export default function FixedInputBar({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 pt-2 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-white/70 dark:from-black/70 to-transparent pointer-events-none">
      <div className="max-w-3xl mx-auto px-3 pointer-events-auto">
        <AIChatBox
          value={value}
          setValue={setValue}
          onSubmit={(text: string, imageDataUrl?: string) => onSubmit(text, imageDataUrl)}
          loading={loading}
          errorMsg={null}
          showSearch={showSearch}
          onToggleSearch={() => setShowSearch((s) => !s)}
          onEnhancePrompt={() => {}}
        />
      </div>
    </div>
  );
}
