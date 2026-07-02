'use client';

// Client island for the share page: react-share needs the browser, and the
// share URL is simply the page the visitor is on.

import ClientSocialShare from '@/components/ClientSocialShare';
import { useEffect, useState } from 'react';

export default function ShareButtons({ title }: { title: string }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  if (!url) return null;

  return <ClientSocialShare url={url} title={title} size={24} />;
}
