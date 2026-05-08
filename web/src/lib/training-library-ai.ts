import type { TrainingDrillLibraryDrill } from '@/lib/types';

import { supabase } from '@web/lib/supabase';

export type DiscoveredTrainingLibrary = {
  generatedAt: string;
  openGraph: {
    description: string;
    image: string;
    siteName: string;
    title: string;
    type: string;
    url: string;
  } | null;
  sourceTitle: string;
  sourceUrl: string;
  summary: string;
  drills: Array<Omit<TrainingDrillLibraryDrill, 'id'> & { image: string }>;
};

export async function discoverTrainingLibraryDrills(sourceUrl: string): Promise<DiscoveredTrainingLibrary> {
  if (!supabase) {
    throw new Error('Supabase is not configured, so drill discovery is unavailable.');
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw new Error(sessionError.message || 'Could not verify your sign-in session.');
  }

  if (!session?.access_token) {
    throw new Error('Your Supabase session has expired. Please sign in again, then try drill discovery.');
  }

  const { data, error } = await supabase.functions.invoke('discover-training-library-drills', {
    body: { sourceUrl },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    throw new Error(error.message || 'Could not discover drills from that link. Please check the URL and try again.');
  }

  const drills = Array.isArray(data?.drills)
    ? data.drills
        .map((entry: unknown) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const drill = entry as {
            image?: unknown;
            lengthMinutes?: unknown;
            link?: unknown;
            name?: unknown;
            outcomes?: unknown;
            skills?: unknown;
          };
          const name = typeof drill.name === 'string' ? drill.name.trim() : '';
          const link = typeof drill.link === 'string' ? drill.link.trim() : '';
          const image = typeof drill.image === 'string' ? drill.image.trim() : '';
          const lengthValue =
            typeof drill.lengthMinutes === 'number'
              ? drill.lengthMinutes
              : typeof drill.lengthMinutes === 'string'
                ? Number(drill.lengthMinutes)
                : 12;
          const outcomes = Array.isArray(drill.outcomes)
            ? drill.outcomes
                .filter((outcome): outcome is string => typeof outcome === 'string')
                .map((outcome) => outcome.trim())
                .filter(Boolean)
            : [];
          const skills = Array.isArray(drill.skills)
            ? drill.skills
                .filter((skill): skill is string => typeof skill === 'string')
                .map((skill) => skill.trim())
                .filter(Boolean)
            : [];

          if (!name || !link) {
            return null;
          }

          return {
            name,
            image,
            link,
            lengthMinutes: Number.isFinite(lengthValue) ? Math.max(1, Math.round(lengthValue)) : 12,
            skills,
            outcomes,
          };
        })
        .filter(
          (entry: (Omit<TrainingDrillLibraryDrill, 'id'> & { image: string }) | null): entry is Omit<
            TrainingDrillLibraryDrill,
            'id'
          > & { image: string } => {
            return entry != null;
          }
        )
    : [];

  if (drills.length <= 0) {
    throw new Error('No usable drills were found at that link.');
  }

  return {
    generatedAt:
      typeof data?.generatedAt === 'string' && data.generatedAt.trim()
        ? data.generatedAt
        : new Date().toISOString(),
    openGraph: data?.openGraph && typeof data.openGraph === 'object'
      ? {
          description: typeof data.openGraph.description === 'string' ? data.openGraph.description.trim() : '',
          image: typeof data.openGraph.image === 'string' ? data.openGraph.image.trim() : '',
          siteName: typeof data.openGraph.siteName === 'string' ? data.openGraph.siteName.trim() : '',
          title: typeof data.openGraph.title === 'string' ? data.openGraph.title.trim() : '',
          type: typeof data.openGraph.type === 'string' ? data.openGraph.type.trim() : '',
          url: typeof data.openGraph.url === 'string' ? data.openGraph.url.trim() : '',
        }
      : null,
    sourceTitle: typeof data?.sourceTitle === 'string' && data.sourceTitle.trim() ? data.sourceTitle.trim() : sourceUrl,
    sourceUrl: typeof data?.sourceUrl === 'string' && data.sourceUrl.trim() ? data.sourceUrl.trim() : sourceUrl,
    summary: typeof data?.summary === 'string' ? data.summary.trim() : '',
    drills,
  };
}
