import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
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

// 간이 인증(MVP): 아이디·비밀번호·이름만으로 가입하며 즉시 사용 가능.
// clerkUserId·email은 이전 Clerk 가입자 데이터 보존용 — 인증 고도화 시 정리 예정.
export const members = pgTable("members", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  clerkUserId: text("clerk_user_id").unique(),
  name: text("name").notNull(),
  email: text("email"),
  // 현재 시범 연동 데이터가 고양특례시의회뿐이라 가입 시 기본 소속으로 지정
  council: text("council").notNull().default("고양특례시의회"),
  committee: text("committee"),
  district: text("district"),
  // 사용하지 않음: 의원 명단 연결 기능은 가입 승인 방식으로 대체됨 (결정 D-21). 기존 데이터 보존용으로 칸만 유지
  councilMemberId: uuid("council_member_id").references(() => councilMembers.id, {
    onDelete: "set null",
  }),
  role: memberRoleEnum("role").notNull().default("member"),
  status: memberStatusEnum("status").notNull().default("pending"),
  rejectedReason: text("rejected_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  approvedAt: timestamp("approved_at"),
  onboardedAt: timestamp("onboarded_at"),
});

// 의회 홈페이지에서 수집한 현역 의원 명단(scripts/sync-council-members.ts).
// 서비스 계정(members)이 이 중 한 명과 연결되면 그 의원의 위원회·선거구로 비서가 맞춰진다.
export const councilMembers = pgTable(
  "council_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    council: text("council").notNull(),
    name: text("name").notNull(),
    // 의회운영위원은 다른 상임위를 겸하므로 여러 개일 수 있음
    committees: jsonb("committees").$type<string[]>().notNull().default([]),
    position: text("position"),
    district: text("district"),
    // 선거구가 맡는 동 목록 (예: ["송포동", "덕이동", "가좌동"]) — 지역구 사업 매칭용
    districtAreas: jsonb("district_areas").$type<string[]>().notNull().default([]),
    // 의원 개인 홈페이지 코드 (/member/{code}/main.do) — 의회 내 고유 식별자로 사용
    homepageCode: text("homepage_code").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("council_members_code_idx").on(t.council, t.homepageCode)]
);

// 쿠키에는 무작위 토큰을 두고, DB에는 그 SHA-256 해시만 저장 (DB 유출 시 세션 탈취 방지)
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  memberId: uuid("member_id")
    .notNull()
    .references(() => members.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const menuEnum =pgEnum("menu", ["laws", "meetings", "budget", "reports"]);
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

// 대상: memberId가 있으면 해당 회원 개인 알림. 없으면 공지 — council이 null이면 전체, 값이 있으면 그 의회 소속 전원.
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id").references(() => members.id, { onDelete: "cascade" }),
    council: text("council"),
    // 문서 기반 알림은 문서 재적재(seed-documents) 시 함께 삭제되도록 연결
    documentId: uuid("document_id").references(() => documents.id, { onDelete: "cascade" }),
    // 값은 src/lib/notification-types.ts 참고
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    href: text("href"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("notifications_created_at_idx").on(t.createdAt)]
);

// 공지는 여러 회원이 공유하므로 읽음 상태를 알림 행이 아닌 회원별로 저장
export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.notificationId, t.memberId] })]
);

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

// 행정사무감사 결과보고서(PDF)에서 추출한 지적사항 — 위원회·부서별 "작년에 무엇을 지적했나" 조회용.
// 의회 홈페이지의 소관부서 페이지가 비어 있어, 위원회별 부서 목록도 이 테이블의 department에서 얻는다.
export const auditFindings = pgTable(
  "audit_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    council: text("council").notNull(),
    year: integer("year").notNull(),
    committee: text("committee").notNull(),
    department: text("department").notNull(),
    // 지적 대상 사업·업무명 — 부서 전반에 대한 지적이면 없음
    project: text("project"),
    // 보고서 표기 그대로(예: 시정요구, 처리요구, 건의사항)
    actionType: text("action_type"),
    finding: text("finding").notNull(),
    request: text("request"),
    page: integer("page"),
    sourceTitle: text("source_title").notNull(),
    sourceUrl: text("source_url").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_findings_scope_idx").on(t.council, t.committee, t.year)]
);

// 의원이 지적사항 카드에서 만든 질의서·자료요구서 초안. 의원별로 저장해 다시 열 때 AI를 다시 부르지 않는다.
export const auditDraftKindEnum = pgEnum("audit_draft_kind", ["question", "data_request"]);

export const auditDrafts = pgTable(
  "audit_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id")
      .notNull()
      .references(() => auditFindings.id, { onDelete: "cascade" }),
    kind: auditDraftKindEnum("kind").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("audit_drafts_member_finding_kind_idx").on(t.memberId, t.findingId, t.kind)]
);

// MVP 규모(시드 데이터 수십 건)에서는 ANN 인덱스 없이 코사인 유사도 순차 검색(<=>)으로 충분
