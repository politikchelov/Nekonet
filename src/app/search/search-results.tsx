"use client";

import React from "react";
import { ROUTES } from "@/constants/routes";
import AnimeCard from "@/components/anime-card";
import BlurFade from "@/components/ui/blur-fade";
import { useSearchParams } from "next/navigation";
import { useGetSearchAnimeResults } from "@/query/get-search-results";

const SearchResults = () => {
  const searchParams = useSearchParams();
  const query = (searchParams.get("q") || "").replace(/^"+|"+$/g, "").trim();
  const { data, isLoading, isError } = useGetSearchAnimeResults({
    q: query,
    page: 1,
  });

  return (
    <div className="flex flex-col gap-8 mt-28 lg:mt-36 pb-20 min-h-[75vh]">
      <div className="glass-panel rounded-2xl p-5 sm:p-6 border border-white/10 shadow-xl flex flex-col gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
          <p className="text-lg font-bold text-white tracking-wide">Каталог AniVibe</p>
        </div>
        <p className="text-sm text-slate-400">
          Русские названия и поиск по каталогу AniVibe
        </p>
      </div>

      <div className="flex items-center gap-2.5 text-2xl font-bold text-white">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
        {query ? <>Результаты: «{query}»</> : "Каталог AniVibe"}
      </div>

      {isLoading && (
        <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5">
          {Array.from({ length: 14 }).map((_, idx) => (
            <div key={idx} className="rounded-2xl aspect-[3/4.2] w-full animate-pulse bg-slate-800/60 border border-white/5" />
          ))}
        </div>
      )}

      {!isLoading && isError && (
        <div className="py-16 text-center text-amber-200">
          AniVibe временно не отвечает. Попробуй обновить страницу позже.
        </div>
      )}

      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5">
        {data?.animes.map((anime, idx) => (
          <BlurFade key={anime.id} delay={idx * 0.04} inView>
            <AnimeCard
              title={anime.name}
              format={anime.type}
              poster={anime.poster}
              href={`${ROUTES.ANIME_DETAILS}/${anime.id}`}
              className="self-center justify-self-center"
              showGenre={false}
            />
          </BlurFade>
        ))}
      </div>

      {!isLoading && !isError && data?.animes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 w-full">
          <p className="text-xl font-bold text-white">Ничего не найдено</p>
          <p className="text-sm text-slate-400">
            В каталоге AniVibe нет совпадений по этому запросу.
          </p>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
