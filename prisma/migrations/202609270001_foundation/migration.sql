-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CodingCategory" AS ENUM ('INFRASTRUCTURE', 'WEB', 'NETWORK', 'PROGRAMMING');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'DELETED');

-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'VERIFIED', 'PUBLISHED', 'DELETED');

-- CreateTable
CREATE TABLE "CodingPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "category" "CodingCategory" NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodingPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileRevision" (
    "id" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "displayName" TEXT NOT NULL,
    "tagline" TEXT,
    "introduction" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mbti" TEXT,
    "mbtiPublic" BOOLEAN NOT NULL DEFAULT false,
    "personality" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileField" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProfileField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "task" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "evidence" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Strength" (
    "id" TEXT NOT NULL,
    "revisionId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "example" TEXT NOT NULL,
    "evidence" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Strength_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhoamiComment" (
    "id" TEXT NOT NULL,
    "nickname" TEXT,
    "body" TEXT,
    "deletionCodeHash" TEXT,
    "status" "CommentStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WhoamiComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentSecurityEvent" (
    "id" TEXT NOT NULL,
    "identifierHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommentSecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommentModerationEvent" (
    "id" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommentModerationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "gameName" TEXT,
    "mimeType" TEXT NOT NULL,
    "bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration" DOUBLE PRECISION,
    "thumbnailKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameLink" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminIdentity" (
    "id" TEXT NOT NULL,
    "githubUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodingPost_slug_key" ON "CodingPost"("slug");

-- CreateIndex
CREATE INDEX "CodingPost_status_publishedAt_id_idx" ON "CodingPost"("status", "publishedAt", "id");

-- CreateIndex
CREATE INDEX "CodingPost_category_status_idx" ON "CodingPost"("category", "status");

-- CreateIndex
CREATE INDEX "ProfileRevision_status_idx" ON "ProfileRevision"("status");

-- CreateIndex
CREATE INDEX "ProfileField_revisionId_isPublic_position_idx" ON "ProfileField"("revisionId", "isPublic", "position");

-- CreateIndex
CREATE INDEX "Skill_revisionId_isPublic_position_idx" ON "Skill"("revisionId", "isPublic", "position");

-- CreateIndex
CREATE INDEX "Strength_revisionId_isPublic_position_idx" ON "Strength"("revisionId", "isPublic", "position");

-- CreateIndex
CREATE INDEX "WhoamiComment_status_createdAt_id_idx" ON "WhoamiComment"("status", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "CommentSecurityEvent_identifierHash_action_createdAt_idx" ON "CommentSecurityEvent"("identifierHash", "action", "createdAt");

-- CreateIndex
CREATE INDEX "CommentSecurityEvent_expiresAt_idx" ON "CommentSecurityEvent"("expiresAt");

-- CreateIndex
CREATE INDEX "CommentModerationEvent_commentId_createdAt_idx" ON "CommentModerationEvent"("commentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_objectKey_key" ON "MediaAsset"("objectKey");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_status_createdAt_idx" ON "MediaAsset"("kind", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramPost_url_key" ON "InstagramPost"("url");

-- CreateIndex
CREATE UNIQUE INDEX "AdminIdentity_githubUserId_key" ON "AdminIdentity"("githubUserId");

-- AddForeignKey
ALTER TABLE "ProfileField" ADD CONSTRAINT "ProfileField_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strength" ADD CONSTRAINT "Strength_revisionId_fkey" FOREIGN KEY ("revisionId") REFERENCES "ProfileRevision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One published profile snapshot. Promote a draft within a transaction.
CREATE UNIQUE INDEX "ProfileRevision_single_published" ON "ProfileRevision" ("status")
WHERE "status" = 'PUBLISHED';

-- Deleted comment payloads must be purged, even if application code regresses.
ALTER TABLE "WhoamiComment" ADD CONSTRAINT "WhoamiComment_payload_state" CHECK (
  ("status" = 'DELETED' AND "nickname" IS NULL AND "body" IS NULL
    AND "deletionCodeHash" IS NULL AND "deletedAt" IS NOT NULL)
  OR
  ("status" <> 'DELETED' AND "nickname" IS NOT NULL AND "body" IS NOT NULL
    AND "deletionCodeHash" IS NOT NULL AND "deletedAt" IS NULL)
);
