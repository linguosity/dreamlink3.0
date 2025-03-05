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
      <FacebookShareButton url={url} quote={title}>
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''}`}>
          <FacebookIcon size={size} round />
        </div>
      </FacebookShareButton>
      
      <TwitterShareButton url={url} title={title}>
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''}`}>
          <TwitterIcon size={size} round />
        </div>
      </TwitterShareButton>
      
      <ViberShareButton url={url} title={title}>
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''}`}>
          <ViberIcon size={size} round />
        </div>
      </ViberShareButton>
      
      <TelegramShareButton url={url} title={title}>
        <div className={`transition-opacity duration-200 ${faded ? 'opacity-50 hover:opacity-100' : ''}`}>
          <TelegramIcon size={size} round />
        </div>
      </TelegramShareButton>
    </div>
  );
}