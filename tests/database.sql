-- Run after migrate deploy against a disposable database named *_test.
-- All fixtures are rolled back. ON_ERROR_STOP makes failed assertions visible.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
  IF current_database() NOT LIKE '%\_test' ESCAPE '\' THEN
    RAISE EXCEPTION 'Database checks require a disposable *_test database';
  END IF;
END $$;

INSERT INTO "ProfileRevision" (id, status, "displayName", "updatedAt")
VALUES ('foundation-public', 'PUBLISHED', 'Fixture', now());
DO $$ BEGIN
  BEGIN
    INSERT INTO "ProfileRevision" (id, status, "displayName", "updatedAt")
    VALUES ('foundation-second-public', 'PUBLISHED', 'Fixture', now());
    RAISE EXCEPTION 'Multiple public profiles unexpectedly accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END $$;
INSERT INTO "ProfileField" (id, "revisionId", label, value)
VALUES ('foundation-private', 'foundation-public', 'Private', 'Private fixture');
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "ProfileField" WHERE id = 'foundation-private' AND "isPublic") THEN
    RAISE EXCEPTION 'Profile field is public by default';
  END IF;
END $$;

INSERT INTO "WhoamiComment" (id, nickname, body, "deletionCodeHash", "updatedAt")
VALUES ('foundation-comment', '테스트', 'Temporary fixture', 'hash-only-fixture', now());
DO $$ BEGIN
  BEGIN
    UPDATE "WhoamiComment" SET status = 'DELETED', "deletedAt" = now()
    WHERE id = 'foundation-comment';
    RAISE EXCEPTION 'Deleted comment payload unexpectedly retained';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END $$;
UPDATE "WhoamiComment" SET status = 'DELETED', "deletedAt" = now(),
nickname = NULL, body = NULL, "deletionCodeHash" = NULL WHERE id = 'foundation-comment';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM "WhoamiComment" WHERE id = 'foundation-comment' AND status = 'PUBLISHED') THEN
    RAISE EXCEPTION 'Deleted comment unexpectedly public';
  END IF;
END $$;
ROLLBACK;
SELECT 'PASS: single published profile, private defaults, deleted payload purge' AS result;
