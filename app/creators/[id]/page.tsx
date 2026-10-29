import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import { Creator } from "@/lib/creators-data";
import { DEMO_CREATORS } from "@/lib/demo-creators";
import { getDatabaseCreatorById } from "@/lib/creators-catalog";
import { CreatorProfileView } from "@/components/creator/CreatorProfileView";
import { CreatorProfileSkeleton } from "@/components/creator/CreatorProfileSkeleton";

export function generateStaticParams() {
  return DEMO_CREATORS.map((creator) => ({
    id: creator.id,
  }));
}

/**
 * Resolves creator profile from live Supabase database first.
 * Safely falls back to clearly labelled demo showcase profiles if unconfigured or not found.
 */
export async function resolveCreatorProfile(id: string): Promise<Creator | null> {
  return getDatabaseCreatorById(id, { allowDemo: true });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creator = await resolveCreatorProfile(id);

  if (!creator) {
    return {
      title: "Creator Not Found - AI Creator Marketplace",
    };
  }

  return {
    title: `${creator.name} - ${creator.professionalTitle} | AI Creator Marketplace`,
    description: creator.bio,
  };
}

async function CreatorProfileContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creator = await resolveCreatorProfile(id);

  if (!creator) {
    notFound();
  }

  return <CreatorProfileView creator={creator} />;
}

export default function CreatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<CreatorProfileSkeleton />}>
      <CreatorProfileContent params={params} />
    </Suspense>
  );
}
