import {Alert, Button} from '@mantine/core';
import classes from './ReviewItem.module.scss';

interface ReviewActionsProps {
  /** The main choice, such as "Approve", and the other, such as "Reject". */
  choices: [main: string, other: string];
  /** What was decided, once it is saved. Replaces the buttons. */
  outcome: string | null;
  isSaving: boolean;
  hasError: boolean;
  onMain: () => void;
  onOther: () => void;
}

/** A reviewer's two choices about one item, then what they decided. */
export function ReviewActions({choices: [main, other], outcome, isSaving, hasError, onMain, onOther}: ReviewActionsProps) {
  if (outcome) {
    return <p className={classes.done} role="status">{outcome}</p>;
  }

  return (
    <>
      {hasError && <Alert color="red" mt="md">Your decision could not be saved. Check your connection and try again.</Alert>}
      <div className={classes.actions}>
        <Button size="md" disabled={isSaving} onClick={onMain}>{main}</Button>
        <Button size="md" variant="default" disabled={isSaving} onClick={onOther}>{other}</Button>
      </div>
    </>
  );
}
