import { createAdminClient } from '@/lib/supabase/admin';
import HeroBanner from '@/components/ui/HeroBanner';
import MovieRow from '@/components/ui/MovieRow';

// Revalidate every 60 seconds for ISR
export const revalidate = 60;

async function getMovies() {
  const supabase = createAdminClient();
  const { data: movies, error } = await supabase
    .from('movies')
    .select('*')
    .eq('is_published', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch movies:', error);
    return [];
  }
  return movies || [];
}

function groupByGenre(movies: any[]) {
  const genreMap: Record<string, any[]> = {};
  movies.forEach((movie) => {
    (movie.genres || []).forEach((genre: string) => {
      if (!genreMap[genre]) genreMap[genre] = [];
      genreMap[genre].push(movie);
    });
  });
  return genreMap;
}

export default async function HomePage() {
  const movies = await getMovies();

  // Pick top-rated movies for hero
  const heroMovies = [...movies]
    .filter((m) => m.backdrop_url)
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 5);

  // Recent additions
  const recentMovies = movies.slice(0, 20);

  // Top rated
  const topRated = [...movies]
    .sort((a, b) => (b.rating || 0) - (a.rating || 0))
    .slice(0, 20);

  // Group by genre
  const genreGroups = groupByGenre(movies);

  // Genre icons
  const genreIcons: Record<string, string> = {
    'Animation': '🎨',
    'Action': '💥',
    'Adventure': '🗺️',
    'Comedy': '😂',
    'Family': '👨‍👩‍👧‍👦',
    'Fantasy': '🧙',
    'Sci-Fi': '🚀',
    'Drama': '🎭',
    'Thriller': '😰',
    'Mystery': '🔍',
    'Romance': '❤️',
    'Crime': '🔪',
  };

  // Top genres sorted by movie count
  const topGenres = Object.entries(genreGroups)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8);

  return (
    <div className="page-enter">
      {/* Hero Banner */}
      <HeroBanner movies={heroMovies} />

      {/* Movie Rows */}
      <div className="relative -mt-20 z-10 space-y-10 pb-16">
        {/* Recently Added */}
        <MovieRow
          title="Recently Added"
          movies={recentMovies}
          icon="🆕"
        />

        {/* Top Rated */}
        <MovieRow
          title="Top Rated"
          movies={topRated}
          icon="⭐"
        />

        {/* Genre Rows */}
        {topGenres.map(([genre, genreMovies]) => (
          <MovieRow
            key={genre}
            title={genre}
            movies={genreMovies}
            icon={genreIcons[genre] || '🎬'}
          />
        ))}
      </div>
    </div>
  );
}
