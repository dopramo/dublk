import { MetadataRoute } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createAdminClient();
  const { data: movies } = await supabase
    .from('movies')
    .select('slug, created_at')
    .eq('is_published', true);

  const baseUrl = 'https://dublk.com';

  const movieUrls = (movies || []).map((movie) => ({
    url: `${baseUrl}/movies/${movie.slug}`,
    lastModified: new Date(movie.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/movies`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...movieUrls,
  ];
}
