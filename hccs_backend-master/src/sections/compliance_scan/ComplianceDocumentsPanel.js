'use client';

import { useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Stack,
    Typography,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import { regenerate_compliance_scan_document } from 'src/components/api/api';

// Displays this lead's Document A/B/C generation history (normally created
// automatically when they pay for the Expert Advisory consultation via the
// Calendly webhook) and gives staff a manual "regenerate now" escape hatch
// for edge cases — e.g. the webhook was down, or an override was set after
// the fact and needs to be re-applied.
export default function ComplianceDocumentsPanel({ scanId, documents, onUploaded }) {
    const [regenerating, setRegenerating] = useState(false);
    const [alertState, setAlertState] = useState(null);

    const handleRegenerate = async () => {
        if (!scanId) return;
        setRegenerating(true);
        setAlertState(null);
        const res = await regenerate_compliance_scan_document({ scan_id: scanId });
        setRegenerating(false);

        if (!res.status) {
            setAlertState({ severity: 'error', message: res.message || 'Failed to regenerate combined document.' });
            return;
        }

        setAlertState({ severity: 'success', message: 'Combined document regenerated.' });
        await onUploaded?.();
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                    Combined Document History
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Document C is normally generated automatically once this lead pays for the Expert
                    Advisory consultation. Use the button below to manually regenerate it now, using
                    whichever document currently applies to this lead (their override if set, otherwise
                    the global standard document).
                </Typography>

                {alertState && (
                    <Alert severity={alertState.severity} sx={{ mb: 2 }}>
                        {alertState.message}
                    </Alert>
                )}

                <LoadingButton variant="contained" loading={regenerating} onClick={handleRegenerate}>
                    Regenerate Document C now
                </LoadingButton>

                <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        History
                    </Typography>
                    {(!documents || documents.length === 0) && (
                        <Typography variant="body2" color="text.secondary">
                            No combined documents generated yet.
                        </Typography>
                    )}
                    <Stack spacing={1.5}>
                        {(documents || []).map((doc) => (
                            <Box
                                key={doc.id}
                                sx={{
                                    p: 1.5,
                                    border: '1px solid',
                                    borderColor: 'divider',
                                    borderRadius: 1,
                                }}
                            >
                                <Stack direction="row" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                    <Box>
                                        <Typography variant="body2">{doc.document_b_filename}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {doc.created_at ? new Date(doc.created_at).toLocaleString() : '-'}
                                        </Typography>
                                        {doc.notes && (
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                {doc.notes}
                                            </Typography>
                                        )}
                                    </Box>
                                    <Stack direction="row" spacing={1}>
                                        <Button
                                            size="small"
                                            href={doc.document_a_url || undefined}
                                            target="_blank"
                                            rel="noopener"
                                            disabled={!doc.document_a_url}
                                        >
                                            Document A
                                        </Button>
                                        <Button
                                            size="small"
                                            href={doc.document_b_url || undefined}
                                            target="_blank"
                                            rel="noopener"
                                            disabled={!doc.document_b_url}
                                        >
                                            Document B
                                        </Button>
                                        <Button
                                            size="small"
                                            variant="contained"
                                            href={doc.document_c_url || undefined}
                                            target="_blank"
                                            rel="noopener"
                                            disabled={!doc.document_c_url}
                                        >
                                            Document C (combined)
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Box>
                        ))}
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}
