import type {DailyVerse} from '@bible-center/core';
import type {TranslationProvider} from '@/bible/translations';

import {useState} from 'react';
import {formatReference, isDateKey, referenceOf} from '@bible-center/core';
import {Alert, Button, Group, Loader, Modal, Radio, Text, TextInput} from '@mantine/core';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {useReferenceSpan} from '@/bible/useReferenceSpan';
import {clearDailyVerse, setDailyVerse} from '@/firebase/dailyVerses';
import {useSpanText} from '@/bible/useSpanText';
import {chosenDailyVerseQuery, useAutomaticDailyVerse} from './dailyVerseQueries';
import classes from './SetVerseDialog.module.scss';

type Choice = 'automatic' | 'chosen';

interface DailyVerseFormProps {
  uid: string;
  date: string;
  /** What is set for the date now. */
  chosen: DailyVerse | null;
  translation: TranslationProvider;
  onClose: () => void;
}

/** What visitors will see, in the admin's translation. */
function Preview({verse, translation}: {verse: DailyVerse | null | undefined; translation: TranslationProvider}) {
  const {label, passage} = useSpanText(verse, translation);
  const isReady = verse && !passage.isPending && !passage.isError;

  return (
    <div className={classes.preview}>
      <p className={classes.previewLabel}>Visitors will see</p>
      {isReady
        ? (
            <>
              <p className={classes.previewText}>{passage.text}</p>
              <p className={classes.previewReference}>{label}</p>
            </>
          )
        : <p className={classes.previewEmpty}>{passage.isError ? 'The verse could not be loaded.' : 'Enter a verse to see it here.'}</p>}
    </div>
  );
}

/** The choice for one date, starting from what is set for it now. */
function DailyVerseForm({uid, date, chosen, translation, onClose}: DailyVerseFormProps) {
  const queryClient = useQueryClient();
  const [choice, setChoice] = useState<Choice>(chosen ? 'chosen' : 'automatic');
  const [text, setText] = useState(() => {
    const reference = chosen ? referenceOf(chosen) : null;

    return reference ? formatReference(reference) : '';
  });
  const checked = useReferenceSpan(text, translation);
  const automatic = useAutomaticDailyVerse(date);
  const verse = choice === 'automatic' ? automatic.data : checked.span;
  const save = useMutation({
    mutationFn: async (next: DailyVerse | null) => {
      await (next ? setDailyVerse(uid, date, next) : clearDailyVerse(date));

      return next;
    },
    onSuccess: (next) => {
      queryClient.setQueryData(chosenDailyVerseQuery(date).queryKey, next);
      onClose();
    },
  });

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      save.mutate(choice === 'automatic' ? null : checked.span);
    }}
    >
      <Radio.Group
        className={classes.choices}
        classNames={{label: classes.choicesLabel}}
        label="Which verse should appear?"
        value={choice}
        onChange={(value) => setChoice(value === 'chosen' ? 'chosen' : 'automatic')}
      >
        <Radio.Card className={classes.choice} value="automatic">
          <Radio.Indicator />
          <div>
            <span className={classes.choiceTitle}>Choose automatically</span>
            <span className={classes.choiceDescription}>Bible Center picks one from its list. This is the default for every date.</span>
          </div>
        </Radio.Card>
        <Radio.Card className={classes.choice} value="chosen">
          <Radio.Indicator />
          <div>
            <span className={classes.choiceTitle}>Choose a verse</span>
            <span className={classes.choiceDescription}>Replaces the automatic pick for this date.</span>
          </div>
        </Radio.Card>
      </Radio.Group>

      {choice === 'chosen' && (
        <>
          <TextInput
            label="Verse or passage"
            placeholder="Lamentations 3:22-23"
            value={text}
            onChange={(event) => setText(event.currentTarget.value)}
            data-autofocus
          />
          {checked.problem && <p className={classes.problem}>{checked.problem}</p>}
        </>
      )}

      <Preview verse={verse} translation={translation} />

      {save.isError && <Alert color="red" mb="md">The verse could not be saved. Check your connection and try again.</Alert>}

      <Group justify="flex-end">
        <Button variant="default" radius="xl" onClick={onClose} disabled={save.isPending}>Cancel</Button>
        <Button type="submit" radius="xl" disabled={!verse} loading={save.isPending}>Save verse</Button>
      </Group>
    </form>
  );
}

interface SetVerseDialogProps {
  uid: string;
  /** The date it opens on, as `YYYY-MM-DD`. */
  initialDate: string;
  translation: TranslationProvider;
  onClose: () => void;
}

/** Lets an admin choose the verse of the day for any date, or leave it to the automatic list. */
export function SetVerseDialog({uid, initialDate, translation, onClose}: SetVerseDialogProps) {
  const [date, setDate] = useState(initialDate);
  const isDate = isDateKey(date);
  const chosen = useQuery({...chosenDailyVerseQuery(date), enabled: isDate});

  return (
    <Modal opened onClose={onClose} title="Set verse of the day" size="lg">
      <TextInput
        type="date"
        label="Date"
        value={date}
        onChange={(event) => setDate(event.currentTarget.value)}
        required
      />

      {!isDate && <Text mt="md">Choose a date.</Text>}

      {isDate && chosen.isPending && <Loader mt="md" aria-label="Loading the verse for this date" />}

      {isDate && chosen.isError && (
        <Alert color="red" mt="md" title="The verse for this date could not be loaded">
          <Button mt="xs" onClick={() => void chosen.refetch()}>Try again</Button>
        </Alert>
      )}

      {isDate && chosen.isSuccess && (
        // Keyed by date, so picking another date starts again from what is set for it.
        <DailyVerseForm key={date} uid={uid} date={date} chosen={chosen.data} translation={translation} onClose={onClose} />
      )}
    </Modal>
  );
}
