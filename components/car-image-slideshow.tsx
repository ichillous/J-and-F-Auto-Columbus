'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, Maximize2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface CarImageSlideshowProps {
  images: string[];
  title: string;
}

export function CarImageSlideshow({ images, title }: CarImageSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const imageCount = images.length;

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? imageCount - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === imageCount - 1 ? 0 : prev + 1));
  };

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const openFullscreen = () => {
    setIsFullscreen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeFullscreen = () => {
    setIsFullscreen(false);
    document.body.style.overflow = 'unset';
  };

  useEffect(() => {
    if (!isFullscreen) return undefined;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeFullscreen();
      } else if (e.key === 'ArrowLeft') {
        setCurrentIndex((prev) => (prev === 0 ? imageCount - 1 : prev - 1));
      } else if (e.key === 'ArrowRight') {
        setCurrentIndex((prev) => (prev === imageCount - 1 ? 0 : prev + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageCount, isFullscreen]);

  useEffect(() => () => {
    document.body.style.overflow = 'unset';
  }, []);

  if (imageCount === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-[1.75rem] border border-white/8 bg-white/[0.03] text-sm text-brand-dim">
        No images available for this vehicle yet.
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full space-y-4">
        <div
          className="group relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border border-white/8 bg-white/[0.03] cursor-pointer"
          onClick={openFullscreen}
        >
          <Image
            src={images[currentIndex]}
            alt={`${title} - Image ${currentIndex + 1}`}
            fill
            sizes="(max-width: 1280px) 100vw, 70vw"
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            priority={currentIndex === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020406]/45 to-transparent" />

          <Button
            variant="outline"
            size="icon"
            className="absolute right-4 top-4 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              openFullscreen();
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>

          {imageCount > 1 ? (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs uppercase tracking-[0.18em] text-white">
                {currentIndex + 1} / {imageCount}
              </div>
            </>
          ) : null}
        </div>

        {imageCount > 1 ? (
          <div className="flex gap-3 overflow-x-auto pb-1">
            {images.map((image, index) => (
              <button
                key={index}
                type="button"
                onClick={() => goToSlide(index)}
                className={`relative h-20 w-24 flex-shrink-0 overflow-hidden rounded-[1rem] border transition ${
                  index === currentIndex
                    ? 'border-accent/35 shadow-glow'
                    : 'border-white/8 hover:border-white/16'
                }`}
              >
                <Image
                  src={image}
                  alt={`${title} thumbnail ${index + 1}`}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {isFullscreen ? (
        <div className="fixed inset-0 z-[90] bg-[#020406]/95 backdrop-blur-md" onClick={closeFullscreen}>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-5 top-5 z-10"
            onClick={closeFullscreen}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="absolute left-1/2 top-5 z-10 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white">
            {currentIndex + 1} / {imageCount}
          </div>
          <div className="flex h-full items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-full w-full max-h-[90vh] max-w-7xl">
              <Image
                src={images[currentIndex]}
                alt={`${title} - Image ${currentIndex + 1}`}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </div>
          {imageCount > 1 ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-5 top-1/2 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevious();
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-5 top-1/2 -translate-y-1/2"
                onClick={(e) => {
                  e.stopPropagation();
                  goToNext();
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
