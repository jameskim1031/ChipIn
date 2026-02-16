


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."gift" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "currency" "text" DEFAULT 'usd'::"text" NOT NULL,
    "total_price_cents" integer NOT NULL,
    "split_locked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "gift_total_price_cents_check" CHECK (("total_price_cents" > 0))
);


ALTER TABLE "public"."gift" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."gift_invitee" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "gift_id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "amount_cents" integer,
    "status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    CONSTRAINT "gift_invitee_amount_cents_check" CHECK ((("amount_cents" IS NULL) OR ("amount_cents" > 0))),
    CONSTRAINT "gift_invitee_status_check" CHECK (("status" = ANY (ARRAY['invited'::"text", 'checkout_created'::"text", 'paid'::"text", 'expired'::"text", 'canceled'::"text"])))
);


ALTER TABLE "public"."gift_invitee" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."gift_progress" AS
SELECT
    NULL::"uuid" AS "gift_id",
    NULL::"text" AS "name",
    NULL::"text" AS "currency",
    NULL::integer AS "total_price_cents",
    NULL::timestamp with time zone AS "split_locked_at",
    NULL::integer AS "invitee_count",
    NULL::integer AS "paid_count",
    NULL::integer AS "assigned_total_cents",
    NULL::integer AS "paid_total_cents",
    NULL::timestamp with time zone AS "created_at";


ALTER VIEW "public"."gift_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_checkout_session" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invitee_id" "uuid" NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "stripe_payment_intent_id" "text",
    "amount_total_cents" integer,
    "status" "text" DEFAULT 'created'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "paid_at" timestamp with time zone,
    CONSTRAINT "stripe_checkout_session_amount_total_cents_check" CHECK ((("amount_total_cents" IS NULL) OR ("amount_total_cents" >= 0))),
    CONSTRAINT "stripe_checkout_session_status_check" CHECK (("status" = ANY (ARRAY['created'::"text", 'paid'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."stripe_checkout_session" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."stripe_event" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "stripe_event_id" "text" NOT NULL,
    "type" "text" NOT NULL,
    "received_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "handled_at" timestamp with time zone
);


ALTER TABLE "public"."stripe_event" OWNER TO "postgres";


ALTER TABLE ONLY "public"."gift_invitee"
    ADD CONSTRAINT "gift_invitee_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."gift"
    ADD CONSTRAINT "gift_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_checkout_session"
    ADD CONSTRAINT "stripe_checkout_session_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_checkout_session"
    ADD CONSTRAINT "stripe_checkout_session_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."stripe_event"
    ADD CONSTRAINT "stripe_event_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stripe_event"
    ADD CONSTRAINT "stripe_event_stripe_event_id_key" UNIQUE ("stripe_event_id");



CREATE INDEX "gift_created_at_idx" ON "public"."gift" USING "btree" ("created_at" DESC);



CREATE INDEX "gift_invitee_gift_id_idx" ON "public"."gift_invitee" USING "btree" ("gift_id");



CREATE INDEX "gift_invitee_status_idx" ON "public"."gift_invitee" USING "btree" ("gift_id", "status");



CREATE UNIQUE INDEX "gift_invitee_unique_gift_email" ON "public"."gift_invitee" USING "btree" ("gift_id", "lower"("email"));



CREATE INDEX "stripe_checkout_session_invitee_id_idx" ON "public"."stripe_checkout_session" USING "btree" ("invitee_id");



CREATE INDEX "stripe_event_received_at_idx" ON "public"."stripe_event" USING "btree" ("received_at" DESC);



CREATE OR REPLACE VIEW "public"."gift_progress" AS
 SELECT "g"."id" AS "gift_id",
    "g"."name",
    "g"."currency",
    "g"."total_price_cents",
    "g"."split_locked_at",
    ("count"("i"."id"))::integer AS "invitee_count",
    ("count"("i"."id") FILTER (WHERE ("i"."status" = 'paid'::"text")))::integer AS "paid_count",
    (COALESCE("sum"("i"."amount_cents") FILTER (WHERE ("i"."amount_cents" IS NOT NULL)), (0)::bigint))::integer AS "assigned_total_cents",
    (COALESCE("sum"("i"."amount_cents") FILTER (WHERE ("i"."status" = 'paid'::"text")), (0)::bigint))::integer AS "paid_total_cents",
    "g"."created_at"
   FROM ("public"."gift" "g"
     LEFT JOIN "public"."gift_invitee" "i" ON (("i"."gift_id" = "g"."id")))
  GROUP BY "g"."id";



ALTER TABLE ONLY "public"."gift_invitee"
    ADD CONSTRAINT "gift_invitee_gift_id_fkey" FOREIGN KEY ("gift_id") REFERENCES "public"."gift"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stripe_checkout_session"
    ADD CONSTRAINT "stripe_checkout_session_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "public"."gift_invitee"("id") ON DELETE CASCADE;





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";








































































































































































GRANT ALL ON TABLE "public"."gift" TO "anon";
GRANT ALL ON TABLE "public"."gift" TO "authenticated";
GRANT ALL ON TABLE "public"."gift" TO "service_role";



GRANT ALL ON TABLE "public"."gift_invitee" TO "anon";
GRANT ALL ON TABLE "public"."gift_invitee" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_invitee" TO "service_role";



GRANT ALL ON TABLE "public"."gift_progress" TO "anon";
GRANT ALL ON TABLE "public"."gift_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."gift_progress" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_checkout_session" TO "anon";
GRANT ALL ON TABLE "public"."stripe_checkout_session" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_checkout_session" TO "service_role";



GRANT ALL ON TABLE "public"."stripe_event" TO "anon";
GRANT ALL ON TABLE "public"."stripe_event" TO "authenticated";
GRANT ALL ON TABLE "public"."stripe_event" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";


