/**
 * DubLK Movie Seeding Script
 * 
 * Searches TMDB for all listed movies, fetches metadata, and inserts into Supabase.
 * Generates a verification report for manual review.
 * 
 * Usage: npx tsx scripts/seed-movies.ts
 */

import { createClient } from '@supabase/supabase-js';

// ===== Configuration =====
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jpkcywwrszbypoivftea.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sbp_0b508595930c4f21df2bba8647ea5cbbd9ba328b';
const TMDB_TOKEN = process.env.TMDB_API_KEY || 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiI3MTc0NWM0YTY2NDMyN2I0YTQ5OTNlY2M4NDlhMWEwMyIsIm5iZiI6MTc3MDQwOTcyNC44NzY5OTk5LCJzdWIiOiI2OTg2NGVmY2M5MTU1YWU4NmM2OTE4MjgiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.p49Vf4Zya9eHX7RewdGJGvnWABamcWprD9EaL00RrGQ';

const GENRE_MAP: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
};

// Movie list with expected years
const MOVIE_LIST = [
  "Avatar 2009",
  "Mouse Hunt 1997",
  "Dora and the Lost City of Gold 2019",
  "Tales from Earthsea 2006",
  "Cats & Dogs 2001",
  "Cats & Dogs: The Revenge of Kitty Galore 2010",
  "Luca 2021",
  "The Lord of the Rings: The Fellowship of the Ring 2001",
  "The Lord of the Rings: The Two Towers 2002",
  "The Lord of the Rings: The Return of the King 2003",
  "The Sea Beast 2022",
  "The Lion King 2019",
  "The Bad Guys 2022",
  "Zootopia 2016",
  "Diary of a Wimpy Kid 2010",
  "Diary of a Wimpy Kid: Rodrick Rules 2011",
  "Diary of a Wimpy Kid: Dog Days 2012",
  "Diary of a Wimpy Kid: The Long Haul 2017",
  "Hop 2011",
  "Robots 2005",
  "Hotel Transylvania 2012",
  "Hotel Transylvania 2 2015",
  "Hotel Transylvania 3: Summer Vacation 2018",
  "Hotel Transylvania: Transformania 2022",
  "Sonic the Hedgehog 2020",
  "Sonic the Hedgehog 2 2022",
  "The Adventures of Tintin 2011",
  "Doctor Dolittle 1998",
  "Dr. Dolittle 2 2001",
  "Dr. Dolittle 3 2006",
  "Dr. Dolittle: Million Dollar Mutts 2009",
  "Sherlock Holmes 2009",
  "Sherlock Holmes: A Game of Shadows 2011",
  "Onward 2020",
  "Home Alone 1990",
  "Home Alone 2: Lost in New York 1992",
  "Puss in Boots 2011",
  "Ratatouille 2007",
  "Penguins of Madagascar 2014",
  "The Smurfs 2011",
  "The Smurfs 2 2013",
  "Scooby-Doo 2002",
  "Scooby-Doo 2: Monsters Unleashed 2004",
  "Yogi Bear 2010",
  "Cars 2006",
  "Cars 2 2011",
  "Cars 3 2017",
  "Tom Sawyer 2000",
  "Journey to the Center of the Earth 2008",
  "Jack the Giant Slayer 2013",
  "Journey 2: The Mysterious Island 2012",
  "Bolt 2008",
  "The Water Horse: Legend of the Deep 2007",
  "Jumanji: The Next Level 2019",
  "Titanic 1997",
  "The Croods 2013",
  "Scooby-Doo on Zombie Island 1998",
  "Big Top Scooby-Doo! 2012",
  "Garfield 2004",
  "Garfield: A Tail of Two Kitties 2006",
  "Leo 2023",
  "Dennis the Menace 1993",
  "Dennis the Menace Strikes Again 1998",
  "Gajaman 2023",
  "Ice Age 2002",
  "Ice Age: The Meltdown 2006",
  "Ice Age: Dawn of the Dinosaurs 2009",
  "Ice Age: Continental Drift 2012",
  "Ice Age: Collision Course 2016",
  "Shrek 2001",
  "Shrek 2 2004",
  "Shrek the Third 2007",
  "Avengers: Infinity War 2018",
  "Charlie and the Chocolate Factory 2005",
  "Raya and the Last Dragon 2021",
  "A.I. Artificial Intelligence 2001",
  "Antz 1998",
  "Harry Potter and the Philosopher's Stone 2001",
  "Harry Potter and the Chamber of Secrets 2002",
  "Harry Potter and the Prisoner of Azkaban 2004",
  "Harry Potter and the Goblet of Fire 2005",
  "Harry Potter and the Order of the Phoenix 2007",
  "Harry Potter and the Half-Blood Prince 2009",
  "Harry Potter and the Deathly Hallows: Part 1 2010",
  "Harry Potter and the Deathly Hallows: Part 2 2011",
  "Madagascar 2005",
  "Madagascar: Escape 2 Africa 2008",
  "Madagascar 3: Europe's Most Wanted 2012",
  "Kung Fu Panda 2008",
  "Kung Fu Panda 2 2011",
  "Kung Fu Panda 3 2016",
  "Spy Kids 2001",
  "Spy Kids 2: The Island of Lost Dreams 2002",
  "Spy Kids 3-D: Game Over 2003",
  "Sinbad: Legend of the Seven Seas 2003",
  "Peter Rabbit 2018",
  "Peter Rabbit 2: The Runaway 2021",
  "Planes 2013",
  "Soul 2020",
  "Mr. Peabody & Sherman 2014",
  "How to Train Your Dragon 2010",
  "How to Train Your Dragon 2 2014",
  "How to Train Your Dragon: The Hidden World 2019",
  "Aladdin 2019",
  "Tangled 2010",
  "Rango 2011",
  "Moana 2016",
  "Luck 2022",
  "Ne Zha 2019",
  "The Garfield Movie 2024",
  "Spider-Man: Into the Spider-Verse 2018",
  "Spider-Man: Across the Spider-Verse 2023",
  "Rio 2011",
  "Rio 2 2014",
  "Life of Pi 2012",
];

function extractYearFromTitle(title: string): { cleanTitle: string; year: number | undefined } {
  const match = title.match(/\s(\d{4})$/);
  if (match) {
    const year = parseInt(match[1]);
    return { cleanTitle: title.replace(/\s\d{4}$/, '').trim(), year };
  }
  return { cleanTitle: title.trim(), year: undefined };
}

function slugify(title: string, year?: number): string {
  let slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (year) slug += `-${year}`;
  return slug;
}

async function searchTMDB(query: string, year?: number) {
  const params = new URLSearchParams({ query, include_adult: 'false', language: 'en-US', page: '1' });
  if (year) params.set('year', year.toString());

  const res = await fetch(`https://api.themoviedb.org/3/search/movie?${params}`, {
    headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_TOKEN}` },
  });

  if (!res.ok) throw new Error(`TMDB search failed: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function getMovieDetails(tmdbId: number) {
  const res = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?language=en-US`, {
    headers: { accept: 'application/json', Authorization: `Bearer ${TMDB_TOKEN}` },
  });
  if (!res.ok) return null;
  return res.json();
}

async function main() {
  console.log('🎬 DubLK Movie Seeding Script\n');
  console.log(`📊 Processing ${MOVIE_LIST.length} movies...\n`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const results: { title: string; status: string; tmdbTitle?: string; tmdbId?: number; year?: number }[] = [];
  let successCount = 0;
  let failCount = 0;
  let skipCount = 0;

  for (let i = 0; i < MOVIE_LIST.length; i++) {
    const rawTitle = MOVIE_LIST[i];
    const { cleanTitle, year } = extractYearFromTitle(rawTitle);

    process.stdout.write(`[${i + 1}/${MOVIE_LIST.length}] ${cleanTitle}${year ? ` (${year})` : ''}... `);

    try {
      // Search TMDB
      const searchResults = await searchTMDB(cleanTitle, year);

      if (searchResults.length === 0) {
        // Try without year
        const fallbackResults = await searchTMDB(cleanTitle);
        if (fallbackResults.length === 0) {
          console.log('❌ NOT FOUND');
          results.push({ title: rawTitle, status: 'NOT_FOUND' });
          failCount++;
          continue;
        }
        searchResults.push(...fallbackResults);
      }

      const bestMatch = searchResults[0];
      const details = await getMovieDetails(bestMatch.id);
      const releaseYear = bestMatch.release_date ? parseInt(bestMatch.release_date.split('-')[0]) : year;
      const slug = slugify(bestMatch.title, releaseYear);

      // Check if already exists
      const { data: existing } = await supabase
        .from('movies')
        .select('id')
        .eq('tmdb_id', bestMatch.id)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`⏭️ SKIPPED (already exists)`);
        results.push({ title: rawTitle, status: 'SKIPPED', tmdbTitle: bestMatch.title, tmdbId: bestMatch.id, year: releaseYear });
        skipCount++;
        continue;
      }

      const genres = (bestMatch.genre_ids || []).map((id: number) => GENRE_MAP[id]).filter(Boolean);

      const { error: insertError } = await supabase.from('movies').insert({
        tmdb_id: bestMatch.id,
        title: bestMatch.title,
        slug,
        description: bestMatch.overview || null,
        poster_url: bestMatch.poster_path ? `https://image.tmdb.org/t/p/w500${bestMatch.poster_path}` : null,
        backdrop_url: bestMatch.backdrop_path ? `https://image.tmdb.org/t/p/original${bestMatch.backdrop_path}` : null,
        genres,
        rating: bestMatch.vote_average || 0,
        release_year: releaseYear,
        runtime: details?.runtime || null,
        bunny_video_id: null,
        is_published: true,
      });

      if (insertError) {
        if (insertError.message.includes('duplicate')) {
          console.log(`⏭️ SKIPPED (duplicate slug)`);
          results.push({ title: rawTitle, status: 'DUPLICATE', tmdbTitle: bestMatch.title, tmdbId: bestMatch.id, year: releaseYear });
          skipCount++;
        } else {
          console.log(`❌ DB ERROR: ${insertError.message}`);
          results.push({ title: rawTitle, status: `DB_ERROR: ${insertError.message}` });
          failCount++;
        }
      } else {
        console.log(`✅ ${bestMatch.title} (${releaseYear}) [TMDB: ${bestMatch.id}]`);
        results.push({ title: rawTitle, status: 'SUCCESS', tmdbTitle: bestMatch.title, tmdbId: bestMatch.id, year: releaseYear });
        successCount++;
      }

      // Rate limiting: 250ms between requests
      await new Promise(resolve => setTimeout(resolve, 250));

    } catch (err: any) {
      console.log(`❌ ERROR: ${err.message}`);
      results.push({ title: rawTitle, status: `ERROR: ${err.message}` });
      failCount++;
    }
  }

  // ===== Verification Report =====
  console.log('\n' + '='.repeat(60));
  console.log('📋 SEEDING VERIFICATION REPORT');
  console.log('='.repeat(60));
  console.log(`\n✅ Success: ${successCount}`);
  console.log(`⏭️ Skipped: ${skipCount}`);
  console.log(`❌ Failed:  ${failCount}`);
  console.log(`📊 Total:   ${MOVIE_LIST.length}\n`);

  // Show matches for manual verification
  console.log('--- MATCHED MOVIES (verify these are correct) ---\n');
  results
    .filter(r => r.status === 'SUCCESS')
    .forEach(r => {
      const yearMatch = r.year ? ` (${r.year})` : '';
      console.log(`  "${r.title}" → "${r.tmdbTitle}"${yearMatch} [TMDB: ${r.tmdbId}]`);
    });

  // Show failures
  if (failCount > 0) {
    console.log('\n--- FAILED (need manual attention) ---\n');
    results
      .filter(r => r.status.startsWith('NOT_FOUND') || r.status.startsWith('ERROR') || r.status.startsWith('DB_ERROR'))
      .forEach(r => {
        console.log(`  ❌ "${r.title}" - ${r.status}`);
      });
  }

  console.log('\n✨ Seeding complete!');
}

main().catch(console.error);
