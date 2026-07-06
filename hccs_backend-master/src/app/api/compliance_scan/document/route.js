import { NextResponse } from 'next/server';
import { requireStaff } from 'src/lib/auth/require-role';
import { createAdminClient } from 'src/lib/supabase/admin';
import { loadScanPayload } from 'src/lib/compliance/load-scan-payload';
import { generateCompliancePdfBuffer, PdfServiceUnavailableError } from 'src/lib/compliance/generate-report-pdf';
import { generateDocumentC } from 'src/lib/compliance/generate-document-c';

// Manual "Regenerate Document C now" action for staff — an escape hatch for
// cases the Calendly webhook doesn't cover (webhook downtime, retroactively
// applying a newly-set lead override, etc). Uses whatever document
// currently applies to this lead (their override if set, else the global
// standard document) — same resolution generateDocumentC always uses.
export async function POST(request) {
    const { user, error: __authError } = await requireStaff();
    if (__authError) return __authError;

    const body = await request.formData();
    const scanId = Number(body.get('scan_id'));

    if (!scanId) {
        return NextResponse.json({ status: false, message: 'Invalid compliance scan id.' });
    }

    const payload = await loadScanPayload(scanId);
    if (payload.error) {
        return NextResponse.json({ status: false, message: payload.error });
    }
    const { scan, summary, answers, actionReports } = payload;

    let documentABuffer;
    try {
        documentABuffer = await generateCompliancePdfBuffer(scan, summary, answers, actionReports);
    } catch (e) {
        if (e instanceof PdfServiceUnavailableError) {
            return NextResponse.json(
                { status: false, message: `Report service unavailable (${e.reason}). Please try again shortly.` },
                { status: 503 },
            );
        }
        throw e;
    }

    const supabase = createAdminClient();
    const result = await generateDocumentC(supabase, scanId, documentABuffer, { uploadedBy: user?.id || null });

    if (!result.ok) {
        const messages = {
            no_document_configured: 'No standard document or lead override is set — nothing to combine with.',
        };
        return NextResponse.json({
            status: false,
            message: messages[result.skippedReason] || result.message || 'Failed to generate combined document.',
        });
    }

    return NextResponse.json({ status: true, data: result.data });
}
