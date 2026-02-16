CREATE TABLE IF NOT EXISTS public.gift_invitation_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id uuid NOT NULL REFERENCES public.gift(id) ON DELETE CASCADE,
  token text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NULL,
  revoked_at timestamp with time zone NULL,
  CONSTRAINT gift_invitation_link_token_key UNIQUE (token),
  CONSTRAINT gift_invitation_link_expires_after_created_check CHECK (
    expires_at IS NULL OR expires_at > created_at
  ),
  CONSTRAINT gift_invitation_link_revoked_after_created_check CHECK (
    revoked_at IS NULL OR revoked_at >= created_at
  )
);

CREATE INDEX IF NOT EXISTS gift_invitation_link_gift_id_idx
  ON public.gift_invitation_link (gift_id);

CREATE INDEX IF NOT EXISTS gift_invitation_link_gift_id_created_at_idx
  ON public.gift_invitation_link (gift_id, created_at DESC);
