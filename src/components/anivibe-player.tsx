"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Play, Search, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AnyRecord = Record<string, unknown>;
type AnimeOption = { id: number; title: string; year?: string; poster?: string };
type EpisodeOption = { number: number; title?: string };

const asRecord = (value: unknown): AnyRecord | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as AnyRecord)
    : null;

const firstText = (record: AnyRecord, keys: string[]) => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
};

const findArray = (value: unknown, keys: string[], depth = 0): unknown[] => {
  if (depth > 3) return [];
  if (Array.isArray(value)) return value;
  const record = asRecord(value);
  if (!record) return [];
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  for (const key of ["data", "result", "anime", "payload"]) {
    const found = findArray(record[key], keys, depth + 1);
    if (found.length) return found;
  }
  return [];
};

const getAnimeOptions = (payload: unknown): AnimeOption[] =>
  findArray(payload, ["results", "items", "animes", "anime", "data"])
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const id = Number(firstText(record, ["id", "anime_id", "shikimori_id", "shikimoriId"]));
      const title = firstText(record, ["title_ru", "russian", "title", "name", "title_en"]);
      if (!Number.isSafeInteger(id) || id < 1 || !title) return null;
      return {
        id,
        title,
        year: firstText(record, ["year", "season_year", "aired_year"]),
        poster: firstText(record, ["poster", "image", "cover", "poster_url"]),
      };
    })
    .filter((item): item is AnimeOption => item !== null)
    .slice(0, 12);

const getEpisodes = (payload: unknown): EpisodeOption[] =>
  findArray(payload, ["episodes", "items", "results", "data"])
    .map((item) => {
      const record = asRecord(item);
      if (!record) return null;
      const number = Number(firstText(record, ["number", "episode", "episode_number", "ordinal"]));
      if (!Number.isSafeInteger(number) || number < 1) return null;
      return { number, title: firstText(record, ["title", "name"]) };
    })
    .filter((item): item is EpisodeOption => item !== null)
    .sort((a, b) => a.number - b.number);

const findEmbedUrl = (payload: unknown, depth = 0): string => {
  if (depth > 4) return "";
  const record = asRecord(payload);
  if (!record) return "";
  for (const key of ["iframe_url", "iframeUrl", "embed_url", "embedUrl", "url", "src"]) {
    const value = record[key];
    if (typeof value === "string" && /^https:\/\//i.test(value)) return value;
  }
  for (const key of ["data", "result", "embed", "player"]) {
    const found = findEmbedUrl(record[key], depth + 1);
    if (found) return found;
  }
  return "";
};

type Props = { animeTitle: string; initialEpisode?: number };

export default function AniVibePlayer({ animeTitle, initialEpisode = 1 }: Props) {
  const [query, setQuery] = useState(animeTitle);
  const [results, setResults] = useState<AnimeOption[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<AnimeOption | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeOption[]>([]);
  const [episode, setEpisode] = useState(initialEpisode);
  const [embedUrl, setEmbedUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  const episodeNumbers = useMemo(() => new Set(episodes.map((item) => item.number)), [episodes]);

  const searchAnime = async (searchQuery: string) => {
    const term = searchQuery.trim();
    if (!term) return;
    setLoading(true);
    setError("");
    setEmbedUrl("");
    setSearched(true);
    try {
      const response = await fetch(`/api/anivibe/search?q=${encodeURIComponent(term)}`);
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error("Не удалось выполнить поиск AniVibe.");
      const found = getAnimeOptions(payload);
      setResults(found);
      if (!found.length) setError("AniVibe не вернул подходящих результатов. Попробуй уточнить название.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка подключения к AniVibe.");
    } finally {
      setLoading(false);
    }
  };

  const chooseAnime = async (item: AnimeOption) => {
    setSelectedAnime(item);
    setEpisodes([]);
    setEpisode(initialEpisode);
    setEmbedUrl("");
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/anivibe/anime/${item.id}/episodes`);
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error("Не удалось загрузить список серий.");
      const found = getEpisodes(payload);
      setEpisodes(found);
      if (!found.length) setError("Список серий пока не удалось распознать в ответе AniVibe.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки серий.");
    } finally {
      setLoading(false);
    }
  };

  const createPlayer = async () => {
    if (!selectedAnime) return;
    setLoading(true);
    setError("");
    setEmbedUrl("");
    try {
      const response = await fetch("/api/anivibe/embed-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anime_id: selectedAnime.id, episode }),
      });
      const payload: unknown = await response.json();
      if (!response.ok) throw new Error("AniVibe не выдал ссылку плеера. Проверь API-ключ и привязанный домен.");
      const url = findEmbedUrl(payload);
      if (!url) throw new Error("AniVibe ответил, но формат ссылки плеера отличается от ожидаемого. Нужна проверка OpenAPI-схемы.");
      setEmbedUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось открыть плеер AniVibe.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (animeTitle.trim()) {
      setQuery(animeTitle);
      void searchAnime(animeTitle);
    }
    // Initial lookup only; later searches are user-triggered.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animeTitle]);

  return (
    <section className="w-full space-y-4 rounded-2xl border border-cyan-500/20 bg-[#0d121d] p-4 sm:p-5 shadow-xl">
      <div className="flex items-center gap-2">
        <Tv className="h-5 w-5 text-cyan-400" />
        <div>
          <h2 className="text-base font-bold text-white">AniVibe Player</h2>
          <p className="text-xs text-slate-400">Каталог и защищённый плеер AniVibe</p>
        </div>
      </div>

      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void searchAnime(query);
        }}
      >
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Название аниме..."
          className="bg-slate-950/70 border-white/10 text-white"
        />
        <Button type="submit" disabled={loading || !query.trim()} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Найти
        </Button>
      </form>

      {results.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {results.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={selectedAnime?.id === item.id ? "default" : "outline"}
              onClick={() => void chooseAnime(item)}
              className="max-w-full"
            >
              <span className="truncate">{item.title}{item.year ? ` · ${item.year}` : ""}</span>
            </Button>
          ))}
        </div>
      )}

      {selectedAnime && (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-slate-300">{selectedAnime.title}</span>
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Серия
            <select
              value={episode}
              onChange={(event) => {
                setEpisode(Number(event.target.value));
                setEmbedUrl("");
              }}
              className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-white"
            >
              {(episodes.length ? episodes : [{ number: initialEpisode }]).map((item) => (
                <option key={item.number} value={item.number}>
                  {item.number}{item.title ? ` — ${item.title}` : ""}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" onClick={() => void createPlayer()} disabled={loading || (episodes.length > 0 && !episodeNumbers.has(episode))} className="gap-2">
            <Play className="h-4 w-4" /> Запустить
          </Button>
        </div>
      )}

      {embedUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-white/10 bg-black">
          <iframe
            key={embedUrl}
            src={embedUrl}
            title={`AniVibe — ${selectedAnime?.title || "anime"}`}
            className="h-full w-full border-0"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {searched && !results.length && !loading && !error && (
        <p className="text-sm text-slate-400">Ничего не найдено.</p>
      )}
    </section>
  );
}
