
'use client';
import React from 'react';

type Mode = 'vibrant' | 'calm';

export default function MotionToggle() {
  const [mode, setMode] = React.useState<Mode>('vibrant');

  React.useEffect(() => {
    // Load from localStorage
    const saved = (typeof window !== 'undefined' && (localStorage.getItem('motion-mode') as Mode)) || 'vibrant';
    setMode(saved);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-motion', saved);
    }
  }, []);

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-motion', mode);
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('motion-mode', mode);
    }
  }, [mode]);

  return (
    <button
      onClick={() => setMode((m) => (m === 'vibrant' ? 'calm' : 'vibrant'))}
      className="rounded-2xl border border-vibrant-cyan px-3 py-2 text-xs font-semibold hover:lift transition-all"
      title={mode === 'vibrant' ? 'Switch to Calm mode (reduce motion)' : 'Switch to Vibrant mode (enable motion)'}
    >
      {mode === 'vibrant' ? 'Calm mode' : 'Vibrant mode'}
    </button>
  );
}
