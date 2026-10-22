CREATE TABLE "demo_question_usage" (
	"key" text NOT NULL,
	"day" date NOT NULL,
	"used" integer NOT NULL,
	"last_requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "demo_question_usage_key_day_pk" PRIMARY KEY("key","day")
);
