
import React from 'react';
import Countdown from './Countdown';
import { Play } from 'lucide-react';

interface Props {
  type: 'direct' | 'aparat';
  link: string;
  cover: string;
  showVideo: boolean;
  countdownEnd: string;
  placeholderTitle?: string;
  placeholderText?: string;
}

export default function VideoPlayer({ type, link, cover, showVideo, countdownEnd, placeholderTitle, placeholderText }: Props) {
  if (!showVideo) {
    return (
      <div className="aspect-video bg-gray-900 flex flex-col items-center justify-center text-white p-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img 
            src={(cover && cover !== "") ? cover : "https://picsum.photos/seed/wait/1280/720"} 
            className="w-full h-full object-cover blur-sm" 
            alt="Cover" 
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 space-y-6 text-center">
          <h2 className="text-xl md:text-3xl font-black" dangerouslySetInnerHTML={{ __html: placeholderTitle || 'زمان شروع وبینار' }} />
          <div className="flex justify-center">
            <Countdown targetDate={countdownEnd} />
          </div>
          <div className="text-gray-400 text-sm md:text-base" dangerouslySetInnerHTML={{ __html: placeholderText || 'تا چند لحظه دیگر همراه شما خواهیم بود...' }} />
        </div>
      </div>
    );
  }

  const renderVideo = () => {
    if (type === 'aparat') {
      return (
        <div className="h-full w-full">
          <iframe 
            src={`https://www.aparat.com/video/video/embed/videohash/${link}/vt/frame`} 
            allowFullScreen={true}
            className="w-full h-full border-0"
          ></iframe>
        </div>
      );
    }

    return (
      <video 
        controls 
        poster={(cover && cover !== "") ? cover : null} 
        className="w-full h-full object-contain bg-black"
        preload="metadata"
      >
        {link && <source src={link} type="video/mp4" />}
        مرورگر شما از پخش ویدیو پشتیبانی نمی‌کند.
      </video>
    );
  };

  return (
    <div className="aspect-video relative group bg-black">
      {renderVideo()}
    </div>
  );
}
