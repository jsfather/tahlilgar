
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Play } from 'lucide-react';
import { Testimonial } from '../types';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

interface Props {
  data: Testimonial[];
  title: string;
}

export const TestimonialsSlider: React.FC<Props> = ({ data, title }) => {
  if (data.length === 0) return null;

  const renderVideo = (item: Testimonial) => {
    if (item.video_type === 'aparat') {
      return (
        <div className="h-full w-full relative group">
          <iframe 
             src={`https://www.aparat.com/video/video/embed/videohash/${item.video_link}/vt/frame`} 
             allowFullScreen 
             className="w-full h-full border-0"
          />
        </div>
      );
    }
    
    // Check if it's an embed code or a direct link
    const isEmbed = item.video_link.includes('<iframe');
    
    if (isEmbed) {
       return (
         <div 
           className="w-full h-full" 
           dangerouslySetInnerHTML={{ __html: item.video_link }} 
         />
       );
    }

    return (
      <video 
        src={item.video_link} 
        poster={item.video_cover}
        controls 
        className="w-full h-full object-cover"
      />
    );
  };

  return (
    <div className="py-12">
      <div className="relative mb-10 text-center">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-gray-100 flex items-center justify-center gap-3">
           <Play fill="currentColor" className="text-primary" />
           {title}
        </h2>
        <div className="w-24 h-1.5 bg-primary mx-auto mt-4 rounded-full opacity-20"></div>
      </div>

      <div className="px-4">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          spaceBetween={20}
          slidesPerView={1}
          navigation
          pagination={{ clickable: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          breakpoints={{
            640: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          }}
          className="testimonials-swiper !pb-12"
        >
          {data.map((item) => (
            <SwiperSlide key={item.id}>
              <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xl border border-gray-100 dark:border-gray-700 h-full flex flex-col group">
                <div className="aspect-video bg-black relative">
                   {renderVideo(item)}
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 line-clamp-2">
                    {item.title}
                  </h3>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      <style>{`
        .testimonials-swiper .swiper-button-next,
        .testimonials-swiper .swiper-button-prev {
          background: white;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          color: #2563eb;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .testimonials-swiper .swiper-button-next:after,
        .testimonials-swiper .swiper-button-prev:after {
          font-size: 18px;
          font-weight: bold;
        }
        .testimonials-swiper .swiper-pagination-bullet-active {
          background: #2563eb;
          width: 24px;
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};
