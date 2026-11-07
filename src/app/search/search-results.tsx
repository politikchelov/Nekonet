"use client";

import React from "react";
import { ROUTES } from "@/constants/routes";
import AnimeCard from "@/components/anime-card";

import BlurFade from "@/components/ui/blur-fade";
import { useRouter, useSearchParams } from "next/navigation";
import { useGetSearchAnimeResults } from "@/query/get-search-results";
import Pagination from "@/components/common/pagination";
import { useAnimeSearchParams } from "@/hooks/use-anime-search-params";
import Select from "@/components/common/select";
import {
  statuses,
  types,
  ratings,
  seasons,
  languages,
  sort,
  genres,
} from "@/constants/search-filters";
import { SearchAnimeParams } from "@/types/anime";
import Button from "@/components/common/custom-button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

const SearchResults = () => {
  const params = useAnimeSearchParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const displayPhrase = params.q.replace(/^"+|"+$/g, "").trim();

  const { data: searchResults, isLoading } = useGetSearchAnimeResults(params);

  const [filters, setFilters] = React.useState<SearchAnimeParams>({
    q: params.q,
    page: params.page,
    type: params.type,
    status: params.status,
    rated: params.rated,
    season: params.season,
    language: params.language,
    sort: params.sort,
    genres: params.genres,
  });

  React.useEffect(() => {
    setFilters({
      q: params.q,
      page: params.page,
      type: params.type,
      status: params.status,
      rated: params.rated,
      season: params.season,
      language: params.language,
      sort: params.sort,
      genres: params.genres,
    });
  }, [params]);

  const handleNextPage = () => {
    if (searchResults?.hasNextPage) {
      handlePageChange((params.page || 1) + 1);
    }
  };

  const handlePreviousPage = () => {
    if ((params.page || 1) > 1) {
      handlePageChange((params.page || 1) - 1);
    }
  };

  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1) return;
    const _params = new URLSearchParams(searchParams.toString());
    _params.set("page", pageNumber.toString());
    router.push(`/search?${_params.toString()}`);
  };

  const onChange = (key: keyof typeof filters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    const nextParams = new URLSearchParams();

    if (displayPhrase !== "") {
      nextParams.set("q", displayPhrase);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (key === "q" || key === "page") return;
      if (typeof value === "string" && value.trim() !== "") {
        nextParams.set(key, value);
      } else if (typeof value === "number" && !isNaN(value)) {
        nextParams.set(key, value.toString());
      }
    });

    nextParams.delete("page");

    router.push(`/search?${nextParams.toString()}`);
  };

  const resetFilters = () => {
    setFilters({
      q: params.q || "",
      page: 1,
      type: "",
      status: "",
      rated: "",
      season: "",
      language: "",
      sort: "",
      genres: "",
    });
    if (params.q && params.q.trim() !== "") {
      router.push(`/search?q=${encodeURIComponent(params.q)}`);
    } else {
      router.push('/search?q=""');
    }
  };

  return (
    <div className="flex flex-col gap-10 mt-28 lg:mt-36 pb-20 min-h-[75vh]">
      <div className="glass-panel rounded-2xl p-6 border border-white/10 shadow-xl flex flex-col gap-6">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
          <p className="text-lg font-bold text-white tracking-wide">Refine Catalog</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Select
            options={types}
            placeholder="Тип"
            value={filters.type}
            onChange={(val) => onChange("type", val)}
          />
          <Select
            options={statuses}
            placeholder="Статус"
            value={filters.status}
            onChange={(val) => onChange("status", val)}
          />
          <Select
            options={ratings}
            placeholder="Возрастной рейтинг"
            value={filters.rated}
            onChange={(val) => onChange("rated", val)}
          />
          <Select
            options={seasons}
            placeholder="Сезон"
            value={filters.season}
            onChange={(val) => onChange("season", val)}
          />
          <Select
            options={languages}
            placeholder="Озвучка"
            value={filters.language}
            onChange={(val) => onChange("language", val)}
          />
          <Select
            options={sort}
            placeholder="Сортировка"
            value={filters.sort}
            onChange={(val) => onChange("sort", val)}
          />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">Жанры</p>
          <ToggleGroup
            type="multiple"
            className="flex flex-wrap justify-start gap-2"
            value={filters.genres?.split(",") || []}
            onValueChange={(value) => {
              onChange("genres", value.filter(Boolean).join(","));
            }}
          >
            {genres.map((genre) => (
              <ToggleGroupItem
                value={genre.value}
                key={genre.value}
                size="sm"
                className={cn(
                  "border border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/40 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl transition-all text-xs",
                  "data-[state=on]:border-cyan-400/50 data-[state=on]:bg-gradient-to-r data-[state=on]:from-cyan-500 data-[state=on]:to-blue-600 data-[state=on]:text-white data-[state=on]:shadow-md data-[state=on]:shadow-cyan-500/20 data-[state=on]:font-bold",
                  filters.genres?.split(",").includes(genre.value)
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold"
                    : "text-slate-300",
                )}
              >
                {genre.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center gap-3 pt-2 border-t border-white/5">
          <Button
            size="sm"
            className="px-6 h-9 rounded-xl font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 transition-all"
            onClick={applyFilters}
          >
            Apply Filters
          </Button>
          <Button
            size="sm"
            className="px-4 h-9 text-slate-400 hover:text-white"
            onClick={resetFilters}
            variant="link"
          >
            Reset
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-2.5 text-2xl font-bold text-white">
        <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
        {displayPhrase === "" ? (
          "Каталог"
        ) : (
          <>
            Результаты по запросу <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">&quot;{displayPhrase}&quot;</span>
          </>
        )}
      </div>
      {isLoading && (
        <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5 content-center">
          {[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1].map((_, idx) => {
            return (
              <div
                key={idx}
                className="rounded-2xl aspect-[3/4.2] w-full animate-pulse bg-slate-800/60 border border-white/5"
              ></div>
            );
          })}
        </div>
      )}
      <div className="grid lg:grid-cols-5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-7 w-full gap-5 content-center">
        {searchResults?.animes.map((anime, idx) => (
          <BlurFade key={idx} delay={idx * 0.05} inView>
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
      {!isLoading && searchResults && searchResults.animes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-3 w-full">
          <p className="text-xl font-bold text-white">Ничего не найдено</p>
          <p className="text-sm text-slate-400">
            Попробуй изменить запрос или убрать часть фильтров.
          </p>
        </div>
      )}

      {searchResults && searchResults.totalPages > 1 && (
        <Pagination
          totalPages={searchResults.totalPages}
          currentPage={params.page || 1}
          handleNextPage={handleNextPage}
          handlePageChange={handlePageChange}
          handlePreviousPage={handlePreviousPage}
        />
      )}
    </div>
  );
};

export default SearchResults;
