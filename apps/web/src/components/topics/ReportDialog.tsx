import type {ReportReason} from '@bible-center/core';

import {useState} from 'react';
import {REPORT_DETAILS_MAX_LENGTH, REPORT_REASONS} from '@bible-center/core';
import {Alert, Button, Group, Modal, Radio, Stack, Text, Textarea} from '@mantine/core';
import {formatTime} from '@/components/formatTime';
import {SupportContact} from '@/components/SupportContact';
import {limitOf} from '@/firebase/userRecord';
import {wasRefusedForBlock} from '@/stores/auth';

interface ReportDialogProps {
  /** Names the verse and topic, such as "Report Psalm 34:18 on grief". */
  title: string;
  /** Resolves once sent, or rejects to show an error. */
  onSend: (reason: ReportReason, details: string) => Promise<unknown>;
  onClose: () => void;
}

function isReportReason(value: string): value is ReportReason {
  return value in REPORT_REASONS;
}

/** Reports a verse that does not belong on a topic, for a reviewer to decide on. */
export function ReportDialog({title, onSend, onClose}: ReportDialogProps) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [hasError, setHasError] = useState(false);
  /** Set when this person sent a report too recently, saying when they can send another. */
  const [waitMessage, setWaitMessage] = useState<string | null>(null);
  /** Set when an admin blocked the account while the dialog was open. */
  const [isBlocked, setIsBlocked] = useState(false);

  async function send() {
    if (!reason) {
      return;
    }

    setIsSending(true);
    setHasError(false);

    try {
      await onSend(reason, details.trim());
      setIsSent(true);
    } catch (error) {
      const limit = limitOf(error);

      if (limit?.type === 'cooldown') {
        setWaitMessage(`You sent a report a moment ago. You can send another at ${formatTime(limit.endsAt)}.`);
      } else if (await wasRefusedForBlock(error)) {
        setIsBlocked(true);
      } else {
        setHasError(true);
      }
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Modal opened onClose={onClose} title={title}>
      {isSent
        ? (
            <>
              <Text>Thank you. Someone will review this report.</Text>
              <Group justify="flex-end" mt="md">
                <Button onClick={onClose} data-autofocus>Done</Button>
              </Group>
            </>
          )
        : (
            <>
              <Radio.Group
                label="What is wrong with it?"
                value={reason ?? ''}
                onChange={(value) => setReason(isReportReason(value) ? value : null)}
              >
                <Stack gap="xs" mt="xs">
                  {Object.entries(REPORT_REASONS).map(([value, label]) => <Radio key={value} value={value} label={label} />)}
                </Stack>
              </Radio.Group>
              <Textarea
                mt="md"
                label="Details (optional)"
                description={`Up to ${REPORT_DETAILS_MAX_LENGTH} characters. Only Bible Center's reviewers see this.`}
                autosize
                minRows={3}
                maxLength={REPORT_DETAILS_MAX_LENGTH}
                value={details}
                onChange={(event) => setDetails(event.currentTarget.value)}
              />
              <Text size="sm" c="var(--bc-muted)" mt="md">Reports do not change the ranking. A reviewer decides whether to remove the verse from this topic.</Text>
              {waitMessage && <Alert color="gray" mt="md" role="status">{waitMessage}</Alert>}
              {isBlocked && (
                <Alert color="red" mt="md" role="alert">
                  Your account has been blocked, so this could not be sent.
                  <SupportContact />
                </Alert>
              )}
              {hasError && <Alert color="red" mt="md">The report could not be sent. Check your connection and try again.</Alert>}
              <Group justify="flex-end" mt="md">
                <Button variant="default" onClick={onClose} disabled={isSending}>Cancel</Button>
                <Button onClick={() => void send()} disabled={!reason || waitMessage !== null || isBlocked} loading={isSending}>Send report</Button>
              </Group>
            </>
          )}
    </Modal>
  );
}
