"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import EpisodeCard from "./common/episode-card";
import { useGetAllEpisodes } from "@/query/get-all-episodes";
import { Episode } from "@/types/episodes";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type Props = {
  animeId: string;
};

const AnimeEpisodes = ({ animeId }: Props) => {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [allEpisodes, setAllEpisodes] = useState<Episode[]>([]);
  const [ranges, setRanges] = useState<string[]>([]);
  const [selectedRange, setSelectedRange] = useState<string>("");

  const { data, isLoading } = useGetAllEpisodes(animeId);

  useEffect(() => {
    if (data) {
      const episodes = data.episodes;
      setAllEpisodes(episodes);

      if (episodes.length > 50) {
        // Calculate ranges
        const rangesArray = [];
        for (let i = 0; i < episodes.length; i += 50) {
          const start = i + 1;
          const end = Math.min(i + 50, episodes.length);
          rangesArray.push(`${start}-${end}`);
        }
        setRanges(rangesArray);
        setSelectedRange(rangesArray[0]);

        // Filter the first range directly from episodes
        const filteredEpisodes = episodes.filter(
          (_, index) => index + 1 >= 1 && index + 1 <= 50,
        );
        setEpisodes(filteredEpisodes);
      } else {
        setEpisodes(episodes);
      }
    }
  }, [data]);

  const handleRangeChange = (range: string) => {
    setSelectedRange(range);

    const [start, end] = range.split("-").map(Number);
    const filteredEpisodes = allEpisodes.filter(
      (_, index) => index + 1 >= start && index + 1 <= end,
    );
    setEpisodes(filteredEpisodes);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value.toLowerCase();
    if (!query) {
      // Reset episodes to the selected range
      const [start, end] = selectedRange.split("-").map(Number);
      const filteredEpisodes = allEpisodes.filter(
        (_, index) => index + 1 >= start && index + 1 <= end,
      );
      setEpisodes(filteredEpisodes);
    } else {
      const filteredEpisodes = episodes.filter((episode, index) => {
        return (
          (index + 1).toString().includes(query) ||
          episode.title.toLowerCase().includes(query) ||
          "серия".includes(query.trim())
        );
      });
      setEpisodes(filteredEpisodes);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row w-full items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 rounded-full bg-gradient-to-b from-cyan-400 to-blue-600 shadow-sm shadow-cyan-500/50" />
          <h3 className="text-xl font-bold text-white tracking-wide">Episodes</h3>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {ranges.length > 0 && (
            <Select onValueChange={handleRangeChange} value={selectedRange}>
              <SelectTrigger className="w-[140px] sm:w-[160px] glass-panel border border-white/10 rounded-xl text-xs font-semibold">
                <SelectValue
                  className="text-white"
                  placeholder="Выбрать диапазон"
                />
              </SelectTrigger>
              <SelectContent className="glass-panel border border-white/10 rounded-xl">
                <SelectGroup>
                  {ranges.map((range) => (
                    <SelectItem key={range} value={range}>
                      {range}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 sm:w-64 max-w-[21.875rem]">
            <Search className="absolute inset-y-0 left-3 m-auto h-4 w-4 text-slate-400" />
            <Input
              placeholder="Поиск серии..."
              className="w-full pl-9 text-xs glass-panel border border-white/10 rounded-xl text-white placeholder-slate-400 focus-visible:ring-cyan-400/50"
              onChange={handleSearch}
            />
          </div>
        </div>
      </div>
      <div className="grid lg:grid-cols-5 grid-cols-4 sm:grid-cols-5 md:grid-cols-6 xl:grid-cols-8 2xl:grid-cols-9 w-full gap-5 content-center">
        {episodes.map((episode, idx) => (
          <EpisodeCard
            episode={episode}
            key={idx}
            className="self-center justify-self-center"
            animeId={animeId}
          />
        ))}
        {!episodes.length && !isLoading && (
          <div className="col-span-full flex items-center justify-center py-12 glass-panel rounded-2xl border border-white/10 text-slate-400 text-sm font-medium">
            Серии не найдены
          </div>
        )}
        {isLoading &&
          Array.from({ length: 14 }).map((_, idx) => (
            <div
              key={idx}
              className={cn([
                "h-[5.25rem] rounded-xl cursor-pointer w-full flex items-center justify-center animate-pulse bg-slate-800/60 border border-white/5",
                "self-center justify-self-center",
              ])}
            ></div>
          ))}
      </div>
    </>
  );
};

export default AnimeEpisodes;
