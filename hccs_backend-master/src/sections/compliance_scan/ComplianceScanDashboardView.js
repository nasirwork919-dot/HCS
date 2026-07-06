'use client';

import { useEffect, useMemo, useState } from 'react';
import Container from '@mui/material/Container';
import {
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { useSettingsContext } from 'src/components/settings';
import { get_compliance_scans } from 'src/components/api/api';

// Aggregate-only view for internal reference — how many compliance-scan
// leads came from each industry. Deliberately shows counts only, no
// company names, emails, or any other customer detail.
export default function ComplianceScanDashboardView() {
  const settings = useSettingsContext();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await get_compliance_scans();
      setRows(res.status ? res.data : []);
    })();
  }, []);

  const industryCounts = useMemo(() => {
    if (!rows) return [];
    const counts = new Map();
    rows.forEach((r) => {
      const key = r.industry?.trim() || 'Unspecified';
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const total = rows?.length ?? 0;
  const maxCount = industryCounts[0]?.[1] || 1;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'md'}>
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Compliance Scan Dashboard" subheader="Aggregate counts only — no customer details" />
        <CardContent>
          {rows === null ? (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={28} />
            </Stack>
          ) : (
            <>
              <Typography variant="h3" sx={{ mb: 0.5 }}>{total}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Total businesses that have used the HR Compliance Scan
              </Typography>

              <Typography variant="subtitle1" sx={{ mb: 1.5 }}>
                By Industry ({industryCounts.length} {industryCounts.length === 1 ? 'industry' : 'industries'})
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Industry</TableCell>
                    <TableCell />
                    <TableCell align="right">Count</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {industryCounts.map(([industry, count]) => (
                    <TableRow key={industry}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{industry}</TableCell>
                      <TableCell sx={{ width: '100%' }}>
                        <LinearProgress
                          variant="determinate"
                          value={(count / maxCount) * 100}
                          sx={{ height: 8, borderRadius: 1 }}
                        />
                      </TableCell>
                      <TableCell align="right">{count}</TableCell>
                    </TableRow>
                  ))}
                  {industryCounts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3}>
                        <Typography variant="body2" color="text.secondary">No submissions yet.</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
