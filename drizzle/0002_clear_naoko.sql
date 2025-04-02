CREATE TABLE IF NOT EXISTS "tasks" (
	"id" uuid PRIMARY KEY NOT NULL,
	"title" varchar(255),
	"description" text,
	"status" "status" DEFAULT 'pending',
	"created_at" timestamp
);
