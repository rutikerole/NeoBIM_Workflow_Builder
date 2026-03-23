import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";

const SITE_URL = process.env.NEXTAUTH_URL || "https://trybuildflow.in";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const publication = await prisma.communityPublication.findFirst({
    where: { workflowId: id },
    select: { title: true, description: true, thumbnailUri: true, tags: true },
  });

  if (!publication) {
    return { title: "Workflow Not Found — BuildFlow" };
  }

  const title = `${publication.title} — BuildFlow Workflow`;
  const description = publication.description || "An AI-powered BIM workflow on BuildFlow";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/community/${id}`,
      siteName: "BuildFlow",
      type: "article",
      images: publication.thumbnailUri
        ? [{ url: publication.thumbnailUri, width: 1200, height: 630, alt: publication.title }]
        : [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: publication.thumbnailUri ? [publication.thumbnailUri] : [`${SITE_URL}/og-image.png`],
      creator: "@BuildFlowAI",
    },
    keywords: publication.tags.length > 0 ? publication.tags : ["BIM", "workflow", "AEC", "architecture"],
  };
}

export default async function CommunityWorkflowPage({ params }: Props) {
  const { id } = await params;

  // Redirect to the dashboard community page — this page exists primarily for OG metadata
  const publication = await prisma.communityPublication.findFirst({
    where: { workflowId: id },
    select: { id: true },
  });

  if (!publication) {
    notFound();
  }

  redirect(`/dashboard/community?highlight=${id}`);
}
