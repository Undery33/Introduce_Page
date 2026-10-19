CREATE TABLE "UploadedImage" (
  "id" TEXT NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "bytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UploadedImage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UploadedImage_dimensions" CHECK ("width" > 0 AND "height" > 0 AND "bytes" > 0)
);
CREATE TABLE "CustomIcon" (
  "id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "imageId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomIcon_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomIcon_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "UploadedImage"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE TABLE "VrchatPhoto" (
  "id" TEXT NOT NULL,
  "legacySrc" TEXT,
  "draft" JSONB NOT NULL,
  "published" JSONB,
  "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "version" INTEGER NOT NULL DEFAULT 1,
  "publishedVersion" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VrchatPhoto_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "VrchatPhoto_legacySrc_key" ON "VrchatPhoto"("legacySrc");
