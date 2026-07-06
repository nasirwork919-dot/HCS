-- Per-lead document override for the compliance-document combining feature.
--
-- The global "standard document" (compliance_standard_document) applies to
-- every lead by default. This table lets an admin set a DIFFERENT document
-- for one specific compliance_scan lead, which takes priority over the
-- global one when that lead's Document C eventually gets generated (at
-- paid-consultation booking time, not at quiz-submission time — see
-- app/api/webhooks/calendly/route.ts). Snapshot pattern: the most recent
-- row per compliance_scan_id is "the active override" for that lead.

CREATE TABLE IF NOT EXISTS public.compliance_scan_document_override (
    id BIGSERIAL PRIMARY KEY,
    compliance_scan_id BIGINT NOT NULL REFERENCES public.compliance_scan(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_scan_document_override_scan
    ON public.compliance_scan_document_override (compliance_scan_id, created_at DESC);

ALTER TABLE public.compliance_scan_document_override ENABLE ROW LEVEL SECURITY;
-- No policies — service-role only, same as the other compliance_* tables.

-- Idempotency for the Calendly webhook: it may retry delivery, and this
-- stops a retry from generating a second Document C for the same booking.
ALTER TABLE public.compliance_document
    ADD COLUMN IF NOT EXISTS calendly_invitee_uri TEXT,
    ADD COLUMN IF NOT EXISTS calendly_event_uri TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_compliance_document_calendly_invitee
    ON public.compliance_document (compliance_scan_id, calendly_invitee_uri)
    WHERE calendly_invitee_uri IS NOT NULL;
