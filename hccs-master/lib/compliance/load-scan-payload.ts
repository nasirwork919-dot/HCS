// Rebuilds the {scanData, summary, answers} shape generateCompliancePdfBuffer
// needs, from a STORED compliance_scan row — used when regenerating
// Document A well after the original quiz-submission request has finished
// (e.g. from the Calendly webhook, days or weeks later). Mirrors
// adaptFrontendBody in lib/compliance/generate-pdf.ts, which does the same
// job from a live request body instead of a stored row.

import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScanData, ScanSummary, ScanAnswer } from "@/lib/compliance/generate-pdf";

function safeParseResults(value: unknown): Record<string, unknown> | null {
    if (!value) return null;
    if (typeof value === "object") return value as Record<string, unknown>;
    try {
        return JSON.parse(value as string);
    } catch {
        return null;
    }
}

function toArrayValue(value: unknown): string[] {
    if (Array.isArray(value)) return value as string[];
    if (!value) return [];
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return [value];
        }
    }
    return [];
}

export interface LoadedScanPayload {
    scanId: number;
    businessEmail: string | null;
    scanData: ScanData;
    summary: ScanSummary;
    answers: ScanAnswer[];
}

export async function loadScanPayload(
    supabase: SupabaseClient,
    scanId: number,
): Promise<LoadedScanPayload | { error: string }> {
    const { data: scan, error } = await supabase
        .from("compliance_scan")
        .select("*")
        .eq("id", scanId)
        .single();

    if (error || !scan) {
        return { error: error?.message || "Compliance scan not found." };
    }

    const results = safeParseResults(scan.results);

    const scanData: ScanData = {
        company_name: scan.company_name ?? null,
        contact_name: scan.contact_name ?? null,
        business_email: scan.business_email ?? null,
        contact_number: scan.contact_number ?? null,
        industry: scan.industry ?? null,
        employess: scan.employess ?? null,
        has_foreign_workers: scan.has_foreign_workers ?? null,
        created_at: scan.created_at ?? null,
    };

    const alerts = toArrayValue(scan.alert);
    const recommendations = toArrayValue(scan.recommendation);

    const summary: ScanSummary = {
        totalScore: scan.total_score ?? (results?.totalScore as number | undefined) ?? null,
        riskLevel: scan.risk_level ?? (results?.riskLevel as string | undefined) ?? null,
        primaryRisk: scan.primary_risk ?? (results?.primaryRisk as string | undefined) ?? null,
        alerts: alerts.length ? alerts : toArrayValue(results?.alerts),
        recommendations: recommendations.length ? recommendations : toArrayValue(results?.recommendations),
    };

    const rawAnswers = Array.isArray(results?.answers) ? (results!.answers as Record<string, unknown>[]) : [];
    const answers: ScanAnswer[] = rawAnswers.map((a) => ({
        question_number: a.question_number as number,
        question: a.question as string,
        selected: a.selected as string,
        question_id: a.question_id as number | string | undefined,
    }));

    return { scanId, businessEmail: scan.business_email ?? null, scanData, summary, answers };
}
