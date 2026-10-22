CREATE TABLE "daily_question_usage" (
	"member_id" uuid NOT NULL,
	"day" date NOT NULL,
	"used" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "daily_question_usage_member_id_day_pk" PRIMARY KEY("member_id","day")
);
--> statement-breakpoint
ALTER TABLE "daily_question_usage" ADD CONSTRAINT "daily_question_usage_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- 기존 대화의 사용량을 KST 날짜별로 보존한다. 기존 timestamp는 UTC 기준이다.
INSERT INTO "daily_question_usage" ("member_id", "day", "used")
SELECT c.member_id, ((m.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date, count(*)::integer
FROM messages m JOIN conversations c ON c.id = m.conversation_id
WHERE m.role = 'user'
  AND ((m.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date
GROUP BY c.member_id, ((m.created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Seoul')::date;
