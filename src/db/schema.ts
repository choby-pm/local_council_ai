import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

export const memberRoleEnum = pgEnum("member_role", ["member", "master"]);
export const memberStatusEnum = pgEnum("member_status", [
  "pending",
  "active",
  "rejected",
  "disabled",
]);

export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  council: text("council").notNull(),
  committee: text("committee").notNull(),
  district: text("district").notNull(),
  role: memberRoleEnum("role").notNull().default("member"),
  status: memberStatusEnum("status").notNull().default("pending"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  onboardedAt: timestamp("onboarded_at"),
});

export const menuEnum = pgEnum("menu", ["laws", "meetings", "budget", "reports"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant"]);
export const trustLevelEnum = pgEnum("trust_level", ["high", "medium", "low"]);
export const messageKindEnum = pgEnum("message_kind", [
  "normal",
  "unavailable",
  "empty",
  "error",
]);

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  menu: menuEnum("menu").notNull(),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: messageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  trustLevel: trustLevelEnum("trust_level"),
  kind: messageKindEnum("kind").notNull().default("normal"),
  sources: jsonb("sources").$type<
    {
      index: number;
      documentId: string;
      sourceUrl: string | null;
      title: string;
      meta: string;
      excerpt: string;
    }[]
  >(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reactionEnum = pgEnum("reaction", ["up", "down"]);

export const feedback = pgTable("feedback", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id, { onDelete: "cascade" }),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  reaction: reactionEnum("reaction").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const savedItemTypeEnum = pgEnum("saved_item_type", [
  "law",
  "meeting",
  "budget",
  "report",
]);

export const savedItems = pgTable("saved_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  type: savedItemTypeEnum("type").notNull(),
  title: text("title").notNull(),
  meta: text("meta"),
  sourceMessageId: uuid("source_message_id").references(() => messages.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const activitySourceEnum = pgEnum("activity_source", ["auto", "manual"]);

export const activityHistory = pgTable("activity_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  source: activitySourceEnum("source").notNull().default("manual"),
  type: text("type").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reportStatusEnum = pgEnum("report_status", [
  "접수됨",
  "생성중",
  "초안생성됨",
  "검토중",
  "완료",
  "보류",
]);

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  periodLabel: text("period_label").notNull(),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  status: reportStatusEnum("status").notNull().default("접수됨"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  finalizedAt: timestamp("finalized_at"),
});

export const reportSections = pgTable("report_sections", {
  id: uuid("id").primaryKey().defaultRandom(),
  reportId: uuid("report_id")
    .notNull()
    .references(() => reports.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  order: integer("order").notNull().default(0),
});

export const documentTypeEnum = pgEnum("document_type", [
  "law",
  "ordinance",
  "meeting",
  "budget",
]);
export const documentStatusEnum = pgEnum("document_status", [
  "수집됨",
  "처리중",
  "색인완료",
  "업데이트필요",
  "오류",
]);

// council = null → 전국 공통 레이어(법령). 값이 있으면 의회별 레이어(조례/회의록/예산).
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: documentTypeEnum("type").notNull(),
  council: text("council"),
  title: text("title").notNull(),
  sourceMeta: jsonb("source_meta").$type<Record<string, string>>(),
  // 원문이 있는 외부(의회 홈페이지 등) URL — 있으면 출처 클릭 시 내부 뷰어 대신 이쪽으로 연결
  sourceUrl: text("source_url"),
  status: documentStatusEnum("status").notNull().default("수집됨"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const documentChunks = pgTable("document_chunks", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  // memberId = null → 전체 공지
  memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  href: text("href"),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const batchStatusEnum = pgEnum("batch_status", [
  "success",
  "failed",
  "delayed",
  "running",
]);

export const batches = pgTable("batches", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  cycle: text("cycle").notNull(),
  status: batchStatusEnum("status").notNull().default("success"),
  lastRunAt: timestamp("last_run_at"),
  note: text("note"),
});

export const errorQueue = pgTable("error_queue", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  queued: boolean("queued").notNull().default(false),
  detectedAt: timestamp("detected_at").notNull().defaultNow(),
});

// MVP 규모(시드 데이터 수십 건)에서는 ANN 인덱스 없이 코사인 유사도 순차 검색(<=>)으로 충분
