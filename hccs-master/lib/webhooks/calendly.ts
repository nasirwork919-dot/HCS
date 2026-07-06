// Verifies Calendly webhook signatures.
//
// Per Calendly's documented v2 webhook signing scheme: the
// `Calendly-Webhook-Signature` header looks like `t=<unix ts>,v1=<hex hmac>`.
// The signed payload is `${t}.${rawRequestBody}`, HMAC-SHA256'd with the
// signing key Calendly returns when the webhook subscription is created.
//
// IMPORTANT: this has not yet been verified against a real Calendly
// delivery — confirm the header name and signed-payload format against an
// actual test webhook before relying on this in production (see the
// CALENDLY_WEBHOOK_SIGNING_KEY setup steps). If Calendly's real payload
// doesn't match, only this file should need to change.

import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

const MAX_TOLERANCE_SECONDS = 5 * 60;

export function verifyCalendlySignature(
    rawBody: string,
    signatureHeader: string | null,
    signingKey: string,
): boolean {
    if (!signatureHeader) return false;

    const parts = Object.fromEntries(
        signatureHeader.split(",").map((pair) => {
            const [key, value] = pair.split("=");
            return [key?.trim(), value?.trim()];
        }),
    );
    const timestamp = parts.t;
    const providedSignature = parts.v1;
    if (!timestamp || !providedSignature) return false;

    const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageSeconds) || ageSeconds > MAX_TOLERANCE_SECONDS) {
        return false;
    }

    const expected = createHmac("sha256", signingKey)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");

    const expectedBuf = Buffer.from(expected, "utf8");
    const providedBuf = Buffer.from(providedSignature, "utf8");
    if (expectedBuf.length !== providedBuf.length) return false;
    return timingSafeEqual(expectedBuf, providedBuf);
}
