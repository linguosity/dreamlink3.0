'use client';

import React from 'react';
import {
  FacebookShareButton,
  TwitterShareButton,
  FacebookIcon,
  TwitterIcon,
  ViberShareButton,
  ViberIcon,
  TelegramShareButton,
  TelegramIcon,
} from 'react-share';

interface SocialShareProps {
  url: string;
  title: string;
  size?: number;
}

export default function SocialShare({
  url,
  title,
  size = 32,
  faded = false
}: SocialShareProps & { faded?: boolean }) {
  return (
    <div className="flex items-center space-x-2">
      <FacebookShareButton url={url} hashtag="#dreamlink">
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''} focus-visible:ring-2 focus-visible:ring-ring rounded-full`} aria-label="Share on Facebook">
          <FacebookIcon size={size} round={true} />
        </div>
      </FacebookShareButton>

      <TwitterShareButton url={url} title={title}>
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''} focus-visible:ring-2 focus-visible:ring-ring rounded-full`} aria-label="Share on Twitter">
          <TwitterIcon size={size} round={true} />
        </div>
      </TwitterShareButton>

      <ViberShareButton url={url} title={title}>
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''} focus-visible:ring-2 focus-visible:ring-ring rounded-full`} aria-label="Share on Viber">
          <ViberIcon size={size} round={true} />
        </div>
      </ViberShareButton>

      <TelegramShareButton url={url} title={title}>
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''} focus-visible:ring-2 focus-visible:ring-ring rounded-full`} aria-label="Share on Telegram">
          <TelegramIcon size={size} round={true} />
        </div>
      </TelegramShareButton>
    </div>
  );
}