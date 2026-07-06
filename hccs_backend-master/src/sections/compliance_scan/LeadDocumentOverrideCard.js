'use client';

import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CardHeader, Chip, Stack, Typography } from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import Iconify from 'src/components/iconify';
import { get_compliance_scan_document_override, save_compliance_scan_document_override } from 'src/components/api/api';

// Lets an admin set a document for THIS lead specifically, overriding the
// global "Standard Supplementary Document" just for them. If set, it's
// used instead of the global one when this lead's Document C eventually
// gets generated (at paid-consultation booking time, not upload time).
export default function LeadDocumentOverrideCard({ scanId }) {
    const [current, setCurrent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [alertState, setAlertState] = useState(null);

    const load = async () => {
        if (!scanId) return;
        setLoading(true);
        const res = await get_compliance_scan_document_override({ scan_id: scanId });
        if (res.status) setCurrent(res.data);
        setLoading(false);
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [scanId]);

    const handleFileChange = (e) => {
        const picked = e.target.files?.[0] ?? null;
        if (picked && picked.type !== 'application/pdf') {
            setAlertState({
                severity: 'error',
                message: "That file isn't a PDF. Please export/save it as a PDF first, then upload it.",
            });
            e.target.value = '';
            setFile(null);
            return;
        }
        setAlertState(null);
        setFile(picked);
    };

    const handleUpload = async () => {
        if (!file || !scanId) return;
        setUploading(true);
        setAlertState(null);
        const res = await save_compliance_scan_document_override({ scan_id: scanId, document_file: file });
        setUploading(false);

        if (!res.status) {
            setAlertState({ severity: 'error', message: res.message || 'Failed to save override document.' });
            return;
        }

        setFile(null);
        setAlertState({ severity: 'success', message: 'Override saved. This will be used instead of the global standard document for this lead.' });
        await load();
    };

    return (
        <Card>
            <CardHeader title="Document Override for This Lead" />
            <CardContent>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Set a document specific to this lead — if present, it&apos;s combined with their report
                    (Document C) instead of the global Standard Supplementary Document, when they book and
                    pay for the Expert Advisory consultation. Leave unset to use the global document.
                </Typography>

                {alertState && (
                    <Alert severity={alertState.severity} sx={{ mb: 2 }}>
                        {alertState.message}
                    </Alert>
                )}

                <Stack spacing={1} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2">Currently set for this lead:</Typography>
                    {loading ? (
                        <Typography variant="body2" color="text.secondary">Loading…</Typography>
                    ) : current ? (
                        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
                            <Chip label={current.original_filename} />
                            <Typography variant="caption" color="text.secondary">
                                since {current.created_at ? new Date(current.created_at).toLocaleString() : '-'}
                            </Typography>
                            {current.url && (
                                <Button size="small" href={current.url} target="_blank" rel="noopener">
                                    View
                                </Button>
                            )}
                        </Stack>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            None — the global standard document will be used for this lead.
                        </Typography>
                    )}
                </Stack>

                <Box>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                        <Button variant="outlined" component="label" startIcon={<Iconify icon="mdi:file-upload-outline" />}>
                            {file ? 'Change file' : (current ? 'Replace override' : 'Set override document')}
                            <input hidden type="file" accept="application/pdf" onChange={handleFileChange} />
                        </Button>
                        {file && <Chip label={file.name} onDelete={() => setFile(null)} />}
                        <LoadingButton variant="contained" loading={uploading} disabled={!file} onClick={handleUpload}>
                            Save
                        </LoadingButton>
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
}
