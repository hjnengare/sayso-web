-- =============================================================
-- User <-> Business Messaging Upgrade
-- =============================================================
-- Upgrades legacy direct-message schema to support:
-- - conversation unread counters for each side
-- - message delivery/read statuses
-- - business-scoped sender identity
-- - RLS based on conversation participant + business ownership
-- - realtime-ready rollups for list previews
-- =============================================================

-- 1) Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'message_sender_type'
  ) THEN
    CREATE TYPE public.message_sender_type AS ENUM ('user', 'business');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'message_delivery_status'
  ) THEN
    CREATE TYPE public.message_delivery_status AS ENUM ('sent', 'delivered', 'read');
  END IF;
END $$;

-- 2) Conversations schema upgrades
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS last_message_preview TEXT,
  ADD COLUMN IF NOT EXISTS user_unread_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_unread_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.conversations
  ALTER COLUMN owner_id DROP NOT NULL;

UPDATE public.conversations c
SET owner_id = b.owner_id
FROM public.businesses b
WHERE c.business_id = b.id
  AND c.owner_id IS NULL
  AND b.owner_id IS NOT NULL;

ALTER TABLE public.conversations
  DROP CONSTRAINT IF EXISTS conversations_user_id_owner_id_key;

UPDATE public.conversations
SET last_message_preview = COALESCE(last_message_preview, '')
WHERE last_message_preview IS NULL;

ALTER TABLE public.conversations
  ALTER COLUMN last_message_preview SET DEFAULT '';

-- Keep nullable-safe in legacy envs. If all rows are populated, enforce NOT NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.conversations
    WHERE last_message_preview IS NULL
  ) THEN
    ALTER TABLE public.conversations
      ALTER COLUMN last_message_preview SET NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_conversations_business_id
  ON public.conversations (business_id);

CREATE INDEX IF NOT EXISTS idx_conversations_owner_id
  ON public.conversations (owner_id);

CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at
  ON public.conversations (last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_business_last_message
  ON public.conversations (business_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversations_user_last_message
  ON public.conversations (user_id, last_message_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_conversations_user_business_unique'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM public.conversations
      WHERE business_id IS NOT NULL
      GROUP BY user_id, business_id
      HAVING COUNT(*) > 1
    ) THEN
      RAISE NOTICE 'Skipping unique user/business index because duplicate legacy rows exist.';
    ELSE
      CREATE UNIQUE INDEX idx_conversations_user_business_unique
        ON public.conversations (user_id, business_id)
        WHERE business_id IS NOT NULL;
    END IF;
  END IF;
END $$;

-- 3) Messages schema upgrades
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS sender_type public.message_sender_type,
  ADD COLUMN IF NOT EXISTS sender_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.message_delivery_status,
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

UPDATE public.messages
SET body = COALESCE(body, content)
WHERE body IS NULL;

UPDATE public.messages
SET sender_user_id = COALESCE(sender_user_id, sender_id)
WHERE sender_user_id IS NULL;

UPDATE public.messages m
SET sender_type = CASE
  WHEN c.user_id = COALESCE(m.sender_user_id, m.sender_id) THEN 'user'::public.message_sender_type
  ELSE 'business'::public.message_sender_type
END,
sender_business_id = CASE
  WHEN c.user_id = COALESCE(m.sender_user_id, m.sender_id) THEN NULL
  ELSE c.business_id
END
FROM public.conversations c
WHERE m.conversation_id = c.id
  AND m.sender_type IS NULL;

UPDATE public.messages
SET sender_type = 'user'::public.message_sender_type
WHERE sender_type IS NULL;

UPDATE public.messages
SET status = CASE
  WHEN COALESCE(read, false) THEN 'read'::public.message_delivery_status
  ELSE 'delivered'::public.message_delivery_status
END
WHERE status IS NULL;

UPDATE public.messages
SET delivered_at = COALESCE(delivered_at, created_at)
WHERE delivered_at IS NULL;

UPDATE public.messages
SET read_at = COALESCE(read_at, updated_at, created_at)
WHERE status = 'read'::public.message_delivery_status
  AND read_at IS NULL;

UPDATE public.messages
SET read = (status = 'read'::public.message_delivery_status)
WHERE read IS DISTINCT FROM (status = 'read'::public.message_delivery_status);

ALTER TABLE public.messages
  ALTER COLUMN body SET DEFAULT '',
  ALTER COLUMN sender_type SET DEFAULT 'user'::public.message_sender_type,
  ALTER COLUMN status SET DEFAULT 'sent'::public.message_delivery_status;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.messages WHERE body IS NULL
  ) THEN
    ALTER TABLE public.messages
      ALTER COLUMN body SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.messages WHERE sender_type IS NULL
  ) THEN
    ALTER TABLE public.messages
      ALTER COLUMN sender_type SET NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.messages WHERE status IS NULL
  ) THEN
    ALTER TABLE public.messages
      ALTER COLUMN status SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.messages
  DROP CONSTRAINT IF EXISTS messages_sender_type_consistency;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_type_consistency
  CHECK (
    (
      sender_type = 'user'::public.message_sender_type
      AND sender_user_id IS NOT NULL
      AND sender_business_id IS NULL
    )
    OR
    (
      sender_type = 'business'::public.message_sender_type
      AND sender_user_id IS NOT NULL
    )
  );

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_cursor
  ON public.messages (conversation_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_type_status
  ON public.messages (conversation_id, sender_type, status);

CREATE INDEX IF NOT EXISTS idx_messages_sender_business
  ON public.messages (sender_business_id);

-- 4) Ownership + participant helpers
CREATE OR REPLACE FUNCTION public.is_business_owner(
  p_user_id UUID,
  p_business_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL OR p_business_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.business_owners bo
    WHERE bo.user_id = p_user_id
      AND bo.business_id = p_business_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.businesses b
    WHERE b.id = p_business_id
      AND b.owner_id = p_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_conversation_participant(
  p_conversation_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_conversation_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.conversations c
    WHERE c.id = p_conversation_id
      AND (
        c.user_id = p_user_id
        OR c.owner_id = p_user_id
        OR public.is_business_owner(p_user_id, c.business_id)
      )
  );
END;
$$;

-- 5) Rollup helpers
CREATE OR REPLACE FUNCTION public.refresh_conversation_rollups(
  p_conversation_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_last_message_at TIMESTAMPTZ;
  v_last_preview TEXT;
  v_user_unread INTEGER := 0;
  v_business_unread INTEGER := 0;
BEGIN
  IF p_conversation_id IS NULL THEN
    RETURN;
  END IF;

  SELECT
    m.created_at,
    LEFT(COALESCE(m.body, m.content, ''), 160)
  INTO v_last_message_at, v_last_preview
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT 1;

  SELECT
    COALESCE(COUNT(*) FILTER (
      WHERE m.sender_type = 'business'::public.message_sender_type
        AND m.status <> 'read'::public.message_delivery_status
    ), 0),
    COALESCE(COUNT(*) FILTER (
      WHERE m.sender_type = 'user'::public.message_sender_type
        AND m.status <> 'read'::public.message_delivery_status
    ), 0)
  INTO v_user_unread, v_business_unread
  FROM public.messages m
  WHERE m.conversation_id = p_conversation_id;

  UPDATE public.conversations c
  SET
    last_message_at = COALESCE(v_last_message_at, c.last_message_at),
    last_message_preview = COALESCE(v_last_preview, ''),
    user_unread_count = v_user_unread,
    business_unread_count = v_business_unread,
    updated_at = NOW()
  WHERE c.id = p_conversation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_message_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_conversation_user_id UUID;
  v_conversation_business_id UUID;
BEGIN
  -- Keep legacy and v2 body columns in sync.
  IF NEW.body IS NULL THEN
    NEW.body := COALESCE(NEW.content, '');
  END IF;

  IF NEW.content IS NULL THEN
    NEW.content := COALESCE(NEW.body, '');
  END IF;

  NEW.body := BTRIM(NEW.body);
  NEW.content := NEW.body;

  IF NEW.sender_user_id IS NULL AND NEW.sender_id IS NOT NULL THEN
    NEW.sender_user_id := NEW.sender_id;
  END IF;

  IF NEW.sender_id IS NULL AND NEW.sender_user_id IS NOT NULL THEN
    NEW.sender_id := NEW.sender_user_id;
  END IF;

  SELECT c.user_id, c.business_id
  INTO v_conversation_user_id, v_conversation_business_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id
  LIMIT 1;

  IF NEW.sender_type IS NULL THEN
    IF NEW.sender_user_id = v_conversation_user_id THEN
      NEW.sender_type := 'user'::public.message_sender_type;
    ELSE
      NEW.sender_type := 'business'::public.message_sender_type;
    END IF;
  END IF;

  IF NEW.sender_type = 'user'::public.message_sender_type THEN
    NEW.sender_business_id := NULL;
  ELSE
    NEW.sender_business_id := COALESCE(NEW.sender_business_id, v_conversation_business_id);
  END IF;

  IF NEW.status IS NULL THEN
    NEW.status := 'sent'::public.message_delivery_status;
  END IF;

  IF NEW.status = 'read'::public.message_delivery_status OR COALESCE(NEW.read, FALSE) THEN
    NEW.status := 'read'::public.message_delivery_status;
    NEW.read := TRUE;
    NEW.read_at := COALESCE(NEW.read_at, NOW());
    NEW.delivered_at := COALESCE(NEW.delivered_at, NEW.created_at, NOW());
  ELSE
    NEW.read := FALSE;
    IF NEW.status = 'delivered'::public.message_delivery_status THEN
      NEW.delivered_at := COALESCE(NEW.delivered_at, NOW());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_conversation_owner_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_id IS NULL THEN
    SELECT b.owner_id
    INTO NEW.owner_id
    FROM public.businesses b
    WHERE b.id = NEW.business_id
    LIMIT 1;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_message_update_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Message author can edit/update freely.
  IF OLD.sender_user_id = auth.uid() THEN
    RETURN NEW;
  END IF;

  -- Non-authors (recipients) may only update delivery/read fields.
  IF NEW.body IS DISTINCT FROM OLD.body
    OR NEW.content IS DISTINCT FROM OLD.content
    OR NEW.sender_type IS DISTINCT FROM OLD.sender_type
    OR NEW.sender_user_id IS DISTINCT FROM OLD.sender_user_id
    OR NEW.sender_business_id IS DISTINCT FROM OLD.sender_business_id
    OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
    OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only the sender can edit message content/identity.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.messages_refresh_conversation_rollups()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  v_conversation_id := COALESCE(NEW.conversation_id, OLD.conversation_id);
  PERFORM public.refresh_conversation_rollups(v_conversation_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Remove legacy trigger to avoid duplicate last_message updates.
DROP TRIGGER IF EXISTS update_conversation_last_message ON public.messages;

DROP TRIGGER IF EXISTS normalize_message_columns_before_write ON public.messages;
CREATE TRIGGER normalize_message_columns_before_write
  BEFORE INSERT OR UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.normalize_message_columns();

DROP TRIGGER IF EXISTS sync_conversation_owner_id_before_write ON public.conversations;
CREATE TRIGGER sync_conversation_owner_id_before_write
  BEFORE INSERT OR UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_conversation_owner_id();

DROP TRIGGER IF EXISTS enforce_message_update_permissions_before_write ON public.messages;
CREATE TRIGGER enforce_message_update_permissions_before_write
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_message_update_permissions();

DROP TRIGGER IF EXISTS messages_refresh_rollups_after_write ON public.messages;
CREATE TRIGGER messages_refresh_rollups_after_write
  AFTER INSERT OR UPDATE OR DELETE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.messages_refresh_conversation_rollups();

-- Backfill rollups for existing data.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.conversations
  LOOP
    PERFORM public.refresh_conversation_rollups(r.id);
  END LOOP;
END $$;

-- 6) RLS hardening for participant access
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete their conversations" ON public.conversations;

DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.messages;

DROP POLICY IF EXISTS conversations_select_participants ON public.conversations;
DROP POLICY IF EXISTS conversations_insert_participants ON public.conversations;
DROP POLICY IF EXISTS conversations_update_participants ON public.conversations;
DROP POLICY IF EXISTS conversations_delete_participants ON public.conversations;

CREATE POLICY conversations_select_participants
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = owner_id
    OR public.is_business_owner(auth.uid(), business_id)
  );

CREATE POLICY conversations_insert_participants
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      auth.uid() = user_id
      AND business_id IS NOT NULL
    )
    OR public.is_business_owner(auth.uid(), business_id)
  );

CREATE POLICY conversations_update_participants
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = owner_id
    OR public.is_business_owner(auth.uid(), business_id)
  )
  WITH CHECK (
    auth.uid() = user_id
    OR auth.uid() = owner_id
    OR public.is_business_owner(auth.uid(), business_id)
  );

CREATE POLICY conversations_delete_participants
  ON public.conversations
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = owner_id
    OR public.is_business_owner(auth.uid(), business_id)
  );

DROP POLICY IF EXISTS messages_select_participants ON public.messages;
DROP POLICY IF EXISTS messages_insert_participants ON public.messages;
DROP POLICY IF EXISTS messages_update_participants ON public.messages;
DROP POLICY IF EXISTS messages_delete_participants ON public.messages;

CREATE POLICY messages_select_participants
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY messages_insert_participants
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_conversation_participant(conversation_id, auth.uid())
    AND sender_user_id = auth.uid()
    AND (
      (
        sender_type = 'user'::public.message_sender_type
        AND EXISTS (
          SELECT 1
          FROM public.conversations c
          WHERE c.id = conversation_id
            AND c.user_id = auth.uid()
        )
      )
      OR
      (
        sender_type = 'business'::public.message_sender_type
        AND EXISTS (
          SELECT 1
          FROM public.conversations c
          WHERE c.id = conversation_id
            AND public.is_business_owner(auth.uid(), c.business_id)
            AND (
              sender_business_id = c.business_id
              OR sender_business_id IS NULL
            )
        )
      )
    )
  );

CREATE POLICY messages_update_participants
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
  )
  WITH CHECK (
    public.is_conversation_participant(conversation_id, auth.uid())
  );

CREATE POLICY messages_delete_participants
  ON public.messages
  FOR DELETE
  TO authenticated
  USING (
    sender_user_id = auth.uid()
  );

-- 7) Realtime publication readiness
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'conversations'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
  END IF;
END $$;

COMMENT ON TABLE public.conversations IS 'User <-> business conversation rollup with unread counts for each side.';
COMMENT ON TABLE public.messages IS 'Conversation messages with sender_type and delivery status for sent/delivered/read receipts.';
COMMENT ON FUNCTION public.refresh_conversation_rollups IS 'Keeps conversation preview + unread counters in sync after message writes.';
