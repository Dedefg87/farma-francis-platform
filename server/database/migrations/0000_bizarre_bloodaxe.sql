CREATE TABLE "agent_pauses" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentId" integer NOT NULL,
	"reason" varchar(255),
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"endedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "agent_status" (
	"userId" integer PRIMARY KEY NOT NULL,
	"status" varchar(16) DEFAULT 'offline' NOT NULL,
	"lastSeen" timestamp DEFAULT now() NOT NULL,
	"currentConversationId" integer
);
--> statement-breakpoint
CREATE TABLE "baby_shower_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"eventDate" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baby_shower_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"imageUrl" text,
	"price" numeric(10, 2) NOT NULL,
	"stock" integer DEFAULT 0 NOT NULL,
	"sold" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "baby_shower_purchases" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" integer NOT NULL,
	"productId" integer NOT NULL,
	"customerId" integer,
	"customerName" varchar(255),
	"customerPhone" varchar(32),
	"quantity" integer DEFAULT 1 NOT NULL,
	"totalAmount" numeric(10, 2) NOT NULL,
	"message" text,
	"whatsappNumber" varchar(32),
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"paidAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_list_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"listId" integer NOT NULL,
	"customerId" integer NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_lists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"createdBy" integer NOT NULL,
	"lastSentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "broadcast_members_sent" (
	"id" serial PRIMARY KEY NOT NULL,
	"messageId" integer NOT NULL,
	"customerId" integer NOT NULL,
	"phone" varchar(32) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"error" text,
	"sentAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "broadcast_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"listId" integer NOT NULL,
	"content" text NOT NULL,
	"fileUrl" text,
	"fileName" text,
	"fileType" text,
	"fileSize" integer,
	"sentBy" integer NOT NULL,
	"sentAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"senderId" integer,
	"senderType" varchar(16) NOT NULL,
	"messageType" varchar(32) NOT NULL,
	"content" text,
	"fileUrl" text,
	"fileName" text,
	"fileSize" integer,
	"mimeType" text,
	"latitude" text,
	"longitude" text,
	"externalId" varchar(255),
	"provider" varchar(16),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer NOT NULL,
	"customerPhone" varchar(32) NOT NULL,
	"channel" varchar(16) NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"assignedTo" integer,
	"queueId" integer,
	"lastActivityAt" timestamp DEFAULT now() NOT NULL,
	"closedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(32) NOT NULL,
	"email" varchar(255),
	"photoUrl" text,
	"status" varchar(32) DEFAULT 'active' NOT NULL,
	"notes" text,
	"source" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customers_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "integration_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"integrationType" varchar(64) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"config" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "queues" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"channel" varchar(16) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"status" varchar(16) DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "received_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(16) NOT NULL,
	"externalId" varchar(255) NOT NULL,
	"fromNumber" text NOT NULL,
	"fromName" text,
	"customerId" integer,
	"messageType" varchar(32),
	"messageText" text,
	"caption" text,
	"latitude" text,
	"longitude" text,
	"mediaUrl" text,
	"mediaId" text,
	"mimeType" text,
	"fileName" text,
	"fileSize" integer,
	"rawPayload" jsonb,
	"processed" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" varchar(16) DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
ALTER TABLE "agent_pauses" ADD CONSTRAINT "agent_pauses_agentId_users_id_fk" FOREIGN KEY ("agentId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_status" ADD CONSTRAINT "agent_status_userId_users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_status" ADD CONSTRAINT "agent_status_currentConversationId_conversations_id_fk" FOREIGN KEY ("currentConversationId") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_shower_products" ADD CONSTRAINT "baby_shower_products_eventId_baby_shower_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."baby_shower_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_shower_purchases" ADD CONSTRAINT "baby_shower_purchases_eventId_baby_shower_events_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."baby_shower_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_shower_purchases" ADD CONSTRAINT "baby_shower_purchases_productId_baby_shower_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."baby_shower_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "baby_shower_purchases" ADD CONSTRAINT "baby_shower_purchases_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_list_members" ADD CONSTRAINT "broadcast_list_members_listId_broadcast_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."broadcast_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_list_members" ADD CONSTRAINT "broadcast_list_members_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_lists" ADD CONSTRAINT "broadcast_lists_createdBy_users_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_members_sent" ADD CONSTRAINT "broadcast_members_sent_messageId_broadcast_messages_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."broadcast_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_members_sent" ADD CONSTRAINT "broadcast_members_sent_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_listId_broadcast_lists_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."broadcast_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "broadcast_messages" ADD CONSTRAINT "broadcast_messages_sentBy_users_id_fk" FOREIGN KEY ("sentBy") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_conversations_id_fk" FOREIGN KEY ("conversationId") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_senderId_users_id_fk" FOREIGN KEY ("senderId") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignedTo_users_id_fk" FOREIGN KEY ("assignedTo") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_queueId_queues_id_fk" FOREIGN KEY ("queueId") REFERENCES "public"."queues"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "received_messages" ADD CONSTRAINT "received_messages_customerId_customers_id_fk" FOREIGN KEY ("customerId") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;