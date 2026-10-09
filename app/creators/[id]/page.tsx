import React from "react";
import { notFound } from "next/navigation";
import { CREATORS_DATA } from "@/lib/creators-data";
import { CreatorProfileView } from "@/components/creator/CreatorProfileView";

export function generateStaticParams() {
  return CREATORS_DATA.map((creator) => ({
    id: creator.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creator = CREATORS_DATA.find((c) => c.id === id);

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

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const creator = CREATORS_DATA.find((c) => c.id === id) || CREATORS_DATA[0];

  if (!creator) {
    notFound();
  }

  return <CreatorProfileView creator={creator} />;
}
