'use client';

import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      className="heading-label transition-smooth"
      style={{ color: 'var(--text-3)', padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.12em' }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--text)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}
    >
      Sign Out
    </button>
  );
}
