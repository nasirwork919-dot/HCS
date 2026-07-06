// Combines a compliance-scan submission's report ("Document A") with
// whichever supplementary document applies to that lead ("Document B") into
// a single "Document C", storing all three for the admin panel.
//
// Document B resolution order:
//   1. compliance_scan_document_override for this scan (admin-set, per-lead)
//   2. compliance_standard_document (admin-set, global default)
//   3. neither configured — silently no-op, same as before
//
// Called from the Calendly paid-consultation webhook
// (app/api/webhooks/calendly/route.ts), NOT from quiz submission anymore —
// generation is deferred until the lead actually pays.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { mergePdfBuffers } from "@/lib/compliance/merge-pdf";

const COMPLIANCE_DOCUMENTS_BUCKET = "compliance-documents";

interface DocumentBSource {
    storage_path: string;
    original_filename: string;
}

async function resolveDocumentB(supabase: SupabaseClient, scanId: number): Promise<DocumentBSource | null> {
    const { data: override } = await supabase
        .from("compliance_scan_document_override")
        .select("storage_path, original_filename")
        .eq("compliance_scan_id", scanId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (override) return override;

    const { data: standard } = await supabase
        .from("compliance_standard_document")
        .select("storage_path, original_filename")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    return standard ?? null;
}

export interface GenerateDocumentCOptions {
    notes?: string;
    calendlyInviteeUri?: string;
    calendlyEventUri?: string;
}

export interface GenerateDocumentCResult {
    ok: boolean;
    skippedReason?: "no_document_configured" | "download_failed" | "upload_failed" | "insert_failed";
}

export async function generateDocumentC(
    supabase: SupabaseClient,
    scanId: number,
    documentABuffer: Buffer,
    opts: GenerateDocumentCOptions = {},
): Promise<GenerateDocumentCResult> {
    const documentB = await resolveDocumentB(supabase, scanId);
    if (!documentB) {
        return { ok: false, skippedReason: "no_document_configured" };
    }

    const { data: documentBFile, error: downloadError } = await supabase.storage
        .from(COMPLIANCE_DOCUMENTS_BUCKET)
        .download(documentB.storage_path);
    if (downloadError || !documentBFile) {
        console.error("[generateDocumentC] failed to download document B:", downloadError?.message);
        return { ok: false, skippedReason: "download_failed" };
    }
    const documentBBuffer = Buffer.from(await documentBFile.arrayBuffer());

    const documentCBuffer = await mergePdfBuffers(documentABuffer, documentBBuffer);

    const timestamp = Date.now();
    const basePath = `compliance/${scanId}/${timestamp}`;
    const documentAPath = `${basePath}-document-a.pdf`;
    const documentCPath = `${basePath}-document-c.pdf`;

    const [uploadA, uploadC] = await Promise.all([
        supabase.storage.from(COMPLIANCE_DOCUMENTS_BUCKET).upload(documentAPath, documentABuffer, { contentType: "application/pdf" }),
        supabase.storage.from(COMPLIANCE_DOCUMENTS_BUCKET).upload(documentCPath, documentCBuffer, { contentType: "application/pdf" }),
    ]);
    if (uploadA.error || uploadC.error) {
        console.error("[generateDocumentC] failed to upload Document A/C:", uploadA.error?.message, uploadC.error?.message);
        return { ok: false, skippedReason: "upload_failed" };
    }

    const { error: insertError } = await supabase.from("compliance_document").insert({
        compliance_scan_id: scanId,
        uploaded_by: null,
        document_b_filename: documentB.original_filename,
        document_b_path: documentB.storage_path,
        document_a_path: documentAPath,
        document_c_path: documentCPath,
        notes: opts.notes ?? "Auto-generated after paid consultation booking via Calendly.",
        calendly_invitee_uri: opts.calendlyInviteeUri ?? null,
        calendly_event_uri: opts.calendlyEventUri ?? null,
    });
    if (insertError) {
        console.error("[generateDocumentC] failed to insert compliance_document row:", insertError.message);
        return { ok: false, skippedReason: "insert_failed" };
    }

    return { ok: true };
}
