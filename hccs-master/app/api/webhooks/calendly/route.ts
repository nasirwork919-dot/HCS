// POST /api/webhooks/calendly — receives Calendly's `invitee.created`
// webhook for the paid "Expert Advisory" consultation booking. When a lead
// who already took the free HR Compliance Scan quiz pays for this
// consultation, this generates their Document C (report + supplementary
// document combined) — see lib/compliance/generate-document-c.ts.
//
// Modeled on app/api/payments/webhook/hitpay/route.ts's pattern: verify
// signature over the raw body, act, always ack with 200 so the sender
// doesn't retry-storm on our logic errors (only signature failures get a
// non-200).
//
// SETUP REQUIRED (see plan handoff notes) — this route is a no-op until:
//   1. CALENDLY_WEBHOOK_SIGNING_KEY and CALENDLY_PAID_EVENT_TYPE_URI are set
//   2. A Calendly webhook subscription exists pointing at this URL
// The payload field names below are Calendly's documented v2 schema but
// have not yet been confirmed against a real delivery — extractInviteeInfo
// is deliberately isolated so only it needs adjusting if the real payload
// differs.

import "server-only";
import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { verifyCalendlySignature } from "@/lib/webhooks/calendly";
import { generateCompliancePdfBuffer, PdfServiceUnavailableError } from "@/lib/compliance/generate-pdf";
import { loadScanPayload } from "@/lib/compliance/load-scan-payload";
import { generateDocumentC } from "@/lib/compliance/generate-document-c";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function adminClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env not configured.");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

interface InviteeInfo {
    email: string;
    inviteeUri: string;
    eventTypeUri: string | null;
    eventUri: string | null;
    paymentSuccessful: boolean | null;
}

// Isolated on purpose — adjust this one function if Calendly's real payload
// shape differs from what's assumed here.
function extractInviteeInfo(payload: Record<string, unknown>): InviteeInfo | null {
    const p = payload.payload as Record<string, unknown> | undefined;
    if (!p) return null;

    const email = typeof p.email === "string" ? p.email : null;
    const inviteeUri = typeof p.uri === "string" ? p.uri : null;
    if (!email || !inviteeUri) return null;

    const scheduledEvent = p.scheduled_event as Record<string, unknown> | undefined;
    const eventTypeUri = typeof scheduledEvent?.event_type === "string" ? (scheduledEvent.event_type as string) : null;
    const eventUri = typeof scheduledEvent?.uri === "string" ? (scheduledEvent.uri as string) : null;

    const payment = p.payment as Record<string, unknown> | undefined;
    const paymentSuccessful = typeof payment?.successful === "boolean" ? (payment.successful as boolean) : null;

    return { email, inviteeUri, eventTypeUri, eventUri, paymentSuccessful };
}

export async function POST(req: Request) {
    const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
    const paidEventTypeUri = process.env.CALENDLY_PAID_EVENT_TYPE_URI;
    if (!signingKey || !paidEventTypeUri) {
        console.error("[calendly webhook] CALENDLY_WEBHOOK_SIGNING_KEY or CALENDLY_PAID_EVENT_TYPE_URI not set, rejecting.");
        return new NextResponse("server not configured", { status: 503 });
    }

    let rawBody: string;
    try {
        rawBody = await req.text();
    } catch {
        return new NextResponse("invalid body", { status: 400 });
    }

    const signatureHeader = req.headers.get("Calendly-Webhook-Signature");
    if (!verifyCalendlySignature(rawBody, signatureHeader, signingKey)) {
        console.warn("[calendly webhook] signature verification failed");
        return new NextResponse("invalid signature", { status: 401 });
    }

    let payload: Record<string, unknown>;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return new NextResponse("invalid json", { status: 400 });
    }

    if (payload.event !== "invitee.created") {
        return NextResponse.json({ ok: true, ignored: "not_invitee_created" });
    }

    const invitee = extractInviteeInfo(payload);
    if (!invitee) {
        console.warn("[calendly webhook] could not parse invitee info from payload");
        return NextResponse.json({ ok: true, ignored: "unparseable_payload" });
    }

    if (invitee.eventTypeUri !== paidEventTypeUri) {
        return NextResponse.json({ ok: true, ignored: "not_paid_event_type" });
    }

    if (invitee.paymentSuccessful === false) {
        console.warn("[calendly webhook] invitee.created for paid event but payment.successful === false:", invitee.email);
        return NextResponse.json({ ok: true, ignored: "payment_not_successful" });
    }

    const supabase = adminClient();

    const { data: matchingScan } = await supabase
        .from("compliance_scan")
        .select("id")
        .ilike("business_email", invitee.email)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!matchingScan) {
        console.warn("[calendly webhook] no compliance_scan found for email:", invitee.email);
        return NextResponse.json({ ok: true, skipped: "no_matching_scan" });
    }
    const scanId = matchingScan.id as number;

    const { data: existingDoc } = await supabase
        .from("compliance_document")
        .select("id")
        .eq("compliance_scan_id", scanId)
        .eq("calendly_invitee_uri", invitee.inviteeUri)
        .maybeSingle();
    if (existingDoc) {
        return NextResponse.json({ ok: true, skipped: "already_generated" });
    }

    const scanPayload = await loadScanPayload(supabase, scanId);
    if ("error" in scanPayload) {
        console.error("[calendly webhook] failed to load scan payload:", scanPayload.error);
        return NextResponse.json({ ok: false, error: scanPayload.error });
    }

    let documentABuffer: Buffer;
    try {
        documentABuffer = await generateCompliancePdfBuffer(
            scanPayload.scanData,
            scanPayload.summary,
            scanPayload.answers,
            [],
            { withCustomerDetails: true },
        );
    } catch (pdfErr) {
        if (pdfErr instanceof PdfServiceUnavailableError) {
            console.warn("[calendly webhook] PDF gateway unavailable:", pdfErr.message);
        } else {
            console.error("[calendly webhook] PDF generation error:", pdfErr);
        }
        // Ack anyway — Calendly shouldn't retry-storm us for a gateway outage.
        // Staff can manually regenerate later from the admin panel.
        return NextResponse.json({ ok: false, error: "pdf_generation_failed" });
    }

    const result = await generateDocumentC(supabase, scanId, documentABuffer, {
        calendlyInviteeUri: invitee.inviteeUri,
        calendlyEventUri: invitee.eventUri ?? undefined,
    });

    return NextResponse.json({ ok: result.ok, skippedReason: result.skippedReason });
}
