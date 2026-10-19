BEGIN;
-- Do not guess which new category an existing WEB/PROGRAMMING post belongs to.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "CodingPost" WHERE "category"::text IN ('WEB', 'PROGRAMMING')) THEN
    RAISE EXCEPTION 'Existing WEB/PROGRAMMING posts require an explicit category migration before admin_posts';
  END IF;
END $$;
ALTER TYPE "CodingCategory" ADD VALUE IF NOT EXISTS 'FRONTEND';
ALTER TYPE "CodingCategory" ADD VALUE IF NOT EXISTS 'BACKEND';
ALTER TABLE "CodingPost"
  ADD COLUMN "description" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "icon" TEXT NOT NULL DEFAULT 'code',
  ADD COLUMN "sections" JSONB NOT NULL DEFAULT '[]';
UPDATE "CodingPost" SET "sections" = jsonb_build_array(jsonb_build_object(
  'id', 'body', 'title', '본문', 'markdown', "markdown"));
CREATE TABLE "CodingPostDraft" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT UNIQUE REFERENCES "CodingPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "slug" TEXT NOT NULL, "title" TEXT NOT NULL, "description" TEXT NOT NULL,
  "category" "CodingCategory" NOT NULL, "icon" TEXT NOT NULL DEFAULT 'code',
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[], "sections" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1, "publishedVersion" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CodingPostDraft_version_positive" CHECK ("version" > 0)
);
INSERT INTO "CodingPostDraft" ("id", "postId", "slug", "title", "description", "category", "icon", "tags", "sections", "publishedVersion", "createdAt", "updatedAt")
SELECT "id", "id", "slug", "title", "description", "category", "icon", "tags", "sections",
  CASE WHEN "status" = 'PUBLISHED' THEN 1 ELSE NULL END, "createdAt", "updatedAt" FROM "CodingPost";
CREATE TABLE "AdminSession" (
  "tokenHash" TEXT PRIMARY KEY, "githubUserId" TEXT NOT NULL, "csrfToken" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AdminSession_expiresAt_idx" ON "AdminSession"("expiresAt");
CREATE TABLE "AdminLoginAttempt" (
  "stateHash" TEXT PRIMARY KEY, "browserHash" TEXT NOT NULL,
  "verifier" TEXT NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "AdminLoginAttempt_expiresAt_idx" ON "AdminLoginAttempt"("expiresAt");
COMMIT;
