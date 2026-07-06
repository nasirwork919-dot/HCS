import { NextResponse } from 'next/server';
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';

const BUCKET = 'compliance-documents';
const SIGNED_URL_EXPIRY_SECONDS = 600;

async function isPdf(file) {
    const head = Buffer.from(await file.slice(0, 5).arrayBuffer());
    return head.toString('utf8') === '%PDF-';
}

// GET ?scan_id=123 — the current lead-specific override document for one
// submission, if any (falls back to the global standard document at
// generation time — this endpoint only reports the per-lead override).
export async function GET(request) {
    const { error: __authError } = await requireStaff();
    if (__authError) return __authError;

    const scanId = Number(new URL(request.url).searchParams.get('scan_id'));
    if (!scanId) {
        return NextResponse.json({ status: false, message: 'Invalid compliance scan id.' });
    }

    const supabase = createAdminClient();
    const { data: current } = await supabase
        .from('compliance_scan_document_override')
        .select('id, storage_path, original_filename, created_at')
        .eq('compliance_scan_id', scanId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (!current) {
        return NextResponse.json({ status: true, data: null });
    }

    const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(current.storage_path, SIGNED_URL_EXPIRY_SECONDS);

    return NextResponse.json({
        status: true,
        data: {
            id: current.id,
            original_filename: current.original_filename,
            created_at: current.created_at,
            url: signed?.signedUrl || null,
        },
    });
}

// POST (formData: scan_id, document_file) — set/replace the override
// document for one specific lead. Does NOT generate anything — generation
// stays deferred to the Calendly paid-consultation webhook.
export async function POST(request) {
    const { user, error: __authError } = await requireStaff();
    if (__authError) return __authError;

    const body = await request.formData();
    const scanId = Number(body.get('scan_id'));
    const file = body.get('document_file');

    if (!scanId) {
        return NextResponse.json({ status: false, message: 'Invalid compliance scan id.' });
    }
    if (!file || typeof file === 'string') {
        return NextResponse.json({ status: false, message: 'No document was uploaded.' });
    }
    if (!(await isPdf(file))) {
        return NextResponse.json({
            status: false,
            message: 'That file isn\'t a PDF. Please export/save it as a PDF first, then upload it.',
        });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storagePath = `compliance/${scanId}/_override/${Date.now()}-${file.name || 'override-document.pdf'}`;

    const supabase = createAdminClient();
    const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: 'application/pdf' });
    if (uploadError) {
        return NextResponse.json({ status: false, message: uploadError.message });
    }

    const { data: createdRow, error: insertError } = await supabase
        .from('compliance_scan_document_override')
        .insert({
            compliance_scan_id: scanId,
            storage_path: storagePath,
            original_filename: file.name || 'override-document.pdf',
            uploaded_by: user?.id || null,
        })
        .select('id, created_at')
        .single();

    if (insertError || !createdRow) {
        return NextResponse.json({ status: false, message: insertError?.message || 'Failed to save override document.' });
    }

    return NextResponse.json({ status: true, data: createdRow });
}
