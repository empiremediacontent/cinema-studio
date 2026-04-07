'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import FeedbackWidget from './FeedbackWidget';

export default function FeedbackProvider() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setEmail(user.email);
      }
    });
  }, []);

  // Only render when user is logged in
  if (!email) return null;

  return <FeedbackWidget userEmail={email} />;
}
