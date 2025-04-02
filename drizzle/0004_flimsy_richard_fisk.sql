DO $$ BEGIN
 CREATE TYPE "public"."task_status" AS ENUM('pending', 'in-progress', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP TABLE "accounts";--> statement-breakpoint
DROP TABLE "sessions";--> statement-breakpoint
DROP TABLE "users";--> statement-breakpoint
DROP TABLE "verification_tokens";--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "title" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET DATA TYPE task_status;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "status" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "tasks" ALTER COLUMN "created_at" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" DROP COLUMN IF EXISTS "user_id";