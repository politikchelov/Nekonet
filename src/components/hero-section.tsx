"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
} from "./ui/carousel";
import Container from "./container";
import { Button } from "./ui/button";
import { Play, Info, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { ROUTES } from "@/constants/routes";
import { MediaList } from "@/types/miruro-api";

type IHeroSectionProps = {
  spotlightAnime: MediaList[];
  isDataLoading: boolean;
};

const HeroSection = ({ spotlightAnime, isDataLoading }: IHeroSectionProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  if (isDataLoading || !spotlightAnime?.length) {
    return <HeroLoadingSkeleton />;
  }

  return (
    <div className="relative w-full h-[85vh] min-h-[580px] max-h-[860px] overflow-hidden select-none bg-[#07090e]">
      <Carousel
        className="w-full h-full"
        setApi={setApi}
        opts={{ loop: true, align: "start" }}
      >
        <CarouselContent className="h-full ml-0">
          {spotlightAnime.map((anime, index) => (
            <CarouselItem key={anime.id || index} className="pl-0 h-full overflow-hidden">
              <HeroCanvasItem anime={anime} isActive={index === current} />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Mini Thumbnail Dock & Navigation controls */}
      <div className="absolute right-4 md:right-12 bottom-8 z-30 flex items-center gap-4">
        {/* Thumbnail Preview Strip (visible on md+) */}
        <div className="hidden lg:flex items-center gap-2 p-1.5 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10">
          {spotlightAnime.slice(0, 6).map((anime, idx) => {
            const thumb =
              anime.coverImage?.large ||
              anime.coverImage?.extraLarge ||
              anime.bannerImage ||
              "";
            const isSelected = idx === current;
            return (
              <button
                key={anime.id || idx}
                onClick={() => api?.scrollTo(idx)}
                className={`relative w-11 h-14 rounded-lg overflow-hidden transition-all duration-300 ${isSelected
                  ? "ring-2 ring-indigo-400 scale-105 opacity-100"
                  : "opacity-45 hover:opacity-80 scale-95"
                  }`}
                aria-label={`Jump to ${anime.title?.english || anime.title?.romaji}`}
              >
                <Image
                  src={thumb}
                  alt={anime.title?.english || "Spotlight thumbnail"}
                  fill
                  className="object-cover"
                  sizes="44px"
                  unoptimized
                />
              </button>
            );
          })}
        </div>

        {/* Next / Prev Controls */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            onClick={() => api?.scrollPrev()}
            className="h-10 w-10 rounded-full bg-slate-900/80 border border-white/15 text-white backdrop-blur-md hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg"
            aria-label="Previous Spotlight"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            onClick={() => api?.scrollNext()}
            className="h-10 w-10 rounded-full bg-slate-900/80 border border-white/15 text-white backdrop-blur-md hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-lg"
            aria-label="Next Spotlight"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const HeroCanvasItem = ({
  anime,
  isActive,
}: {
  anime: MediaList;
  isActive: boolean;
}) => {
  const bgImage =
    anime.bannerImage ||
    anime.coverImage?.extraLarge ||
    anime.coverImage?.large ||
    "";

  const englishTitle = anime.title?.english;
  const romajiTitle = anime.title?.romaji;
  const primaryTitle = englishTitle || romajiTitle || anime.title?.native || "Untitled";
  const subtitle = englishTitle && romajiTitle && englishTitle !== romajiTitle ? romajiTitle : anime.title?.native || "";

  const cleanDescription = (anime as any).description
    ? (anime as any).description.replace(/<[^>]*>?/gm, "").trim()
    : "Stream this breathtaking title on Miru with zero ad interruptions and crisp playback.";

  return (
    <div className="relative w-full h-[85vh] min-h-[580px] max-h-[860px] overflow-hidden">
      {/* Background Banner with Dynamic Glow */}
      <div
        className={`absolute inset-0 bg-cover bg-center transition-transform duration-1000 ${isActive ? "scale-105" : "scale-100"
          }`}
        // Only fetch the visible slide's large banner; other slides load on demand.
        style={isActive ? { backgroundImage: `url(${bgImage})` } : undefined}
      />

      {/* Atmospheric Overlays */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#07090e] via-[#07090e]/85 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/50 to-transparent z-10" />
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-[#07090e]/40 to-[#07090e] z-10" />

      {/* Content Stage */}
      <div className="relative z-20 w-full h-full flex items-center">
        <Container className="w-full pt-16 pb-12">
          <div
            className={`max-w-2xl space-y-4 transition-all duration-700 ${isActive ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
          >
            {/* Main Title & Subtitle */}
            <div className="space-y-1">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] line-clamp-2 drop-shadow-md">
                {primaryTitle}
              </h1>
              {subtitle && (
                <p className="text-sm md:text-base font-medium text-slate-400/90 tracking-wide">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Meta Tags Row */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-300 pt-1">
              {anime.format && (
                <span className="px-2.5 py-0.5 rounded-md font-bold tracking-wider bg-violet-600/80 text-white shadow-sm">
                  {anime.format}
                </span>
              )}
              {!!anime.averageScore && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {anime.averageScore}%
                </span>
              )}
              {anime.seasonYear && (
                <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                  {anime.season ? `${anime.season} ` : ""}{anime.seasonYear}
                </span>
              )}
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                HD 1080P
              </span>
              {anime.genres?.slice(0, 3).map((g) => (
                <span key={g} className="text-slate-400 font-medium">
                  • {g}
                </span>
              ))}
            </div>

            {/* Synopsis */}
            <p className="text-sm md:text-base text-slate-300/85 line-clamp-3 leading-relaxed max-w-xl pt-1">
              {cleanDescription}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-3">
              <Link
                href={`${ROUTES.WATCH}?anime=${anime.id}&ep=1`}
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                <Play className="h-4 w-4 fill-white" />
                <span>Watch Now</span>
              </Link>

              <Link
                href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm backdrop-blur-md border border-white/10 transition-all duration-200 hover:scale-105 active:scale-95"
              >
                <Info className="h-4 w-4 text-slate-300" />
                <span>Details</span>
              </Link>
            </div>
          </div>
        </Container>
      </div>
    </div>
  );
};

const HeroLoadingSkeleton = () => {
  return (
    <div className="relative w-full h-[85vh] min-h-[580px] bg-[#07090e] flex items-center">
      <Container className="w-full">
        <div className="max-w-xl space-y-4">
          <div className="h-6 w-36 rounded-full bg-slate-800/80 animate-pulse" />
          <div className="h-14 w-4/5 rounded-2xl bg-slate-800/80 animate-pulse" />
          <div className="h-5 w-1/2 rounded-lg bg-slate-800/60 animate-pulse" />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-md bg-slate-800/60 animate-pulse" />
            <div className="h-6 w-16 rounded-md bg-slate-800/60 animate-pulse" />
            <div className="h-6 w-24 rounded-md bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-16 w-full rounded-xl bg-slate-800/50 animate-pulse" />
          <div className="flex gap-4 pt-2">
            <div className="h-12 w-36 rounded-xl bg-slate-800 animate-pulse" />
            <div className="h-12 w-28 rounded-xl bg-slate-800/60 animate-pulse" />
          </div>
        </div>
      </Container>
    </div>
  );
};

export default HeroSection;
