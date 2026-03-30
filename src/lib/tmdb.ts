const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  vote_average: number;
  genre_ids: number[];
  runtime?: number;
  genres?: { id: number; name: string }[];
}

export interface TMDBSearchResult {
  page: number;
  results: TMDBMovie[];
  total_pages: number;
  total_results: number;
}

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

function getHeaders() {
  return {
    accept: 'application/json',
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
  };
}

export async function searchMovie(query: string, year?: number): Promise<TMDBMovie[]> {
  const params = new URLSearchParams({ query, include_adult: 'false', language: 'en-US', page: '1' });
  if (year) params.set('year', year.toString());
  
  const res = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  
  const data: TMDBSearchResult = await res.json();
  return data.results;
}

export async function getMovieDetails(tmdbId: number): Promise<TMDBMovie> {
  const res = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?language=en-US`, { headers: getHeaders() });
  if (!res.ok) throw new Error(`TMDB details failed: ${res.status}`);
  return res.json();
}

export function getPosterUrl(path: string | null, size: string = 'w500'): string {
  if (!path) return '/placeholder-poster.jpg';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getBackdropUrl(path: string | null, size: string = 'original'): string {
  if (!path) return '/placeholder-backdrop.jpg';
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds.map(id => GENRE_MAP[id]).filter(Boolean);
}

export function getGenreNamesFromObjects(genres: { id: number; name: string }[]): string[] {
  return genres.map(g => g.name);
}
