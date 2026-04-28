import { useState, useEffect } from 'react';
import { checkServerOnline } from '@/lib/api';

export function useSyncStatus() {
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const check = async () => setOnline(await checkServerOnline());
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, []);

  return online;
}
