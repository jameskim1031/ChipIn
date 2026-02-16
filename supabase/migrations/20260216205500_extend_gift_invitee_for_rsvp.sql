ALTER TABLE public.gift_invitee
  ADD COLUMN IF NOT EXISTS name text NULL,
  ADD COLUMN IF NOT EXISTS phone text NULL;

ALTER TABLE public.gift_invitee
  DROP CONSTRAINT IF EXISTS gift_invitee_status_check;

ALTER TABLE public.gift_invitee
  ADD CONSTRAINT gift_invitee_status_check CHECK (
    status = ANY (
      ARRAY[
        'invited'::text,
        'accepted'::text,
        'declined'::text,
        'checkout_created'::text,
        'paid'::text,
        'expired'::text,
        'canceled'::text
      ]
    )
  );
