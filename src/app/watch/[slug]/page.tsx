import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/admin';
import WatchClient from './WatchClient';

interface Props {
  params: { slug: string };
}

async function getMovie(slug: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('movies')
    .select('id, title, slug, bunny_video_id')
    .eq('slug', slug)
    .eq('is_published', true)
    .single();

  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const movie = await getMovie(params.slug);
  return {
    title: movie ? `Watch ${movie.title}` : 'Watch Movie',
    robots: { index: false, follow: false },
  };
}

export default async function WatchPage({ params }: Props) {
  const movie = await getMovie(params.slug);
  if (!movie) notFound();

  return <WatchClient movie={movie} />;
}
