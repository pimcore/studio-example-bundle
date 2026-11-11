<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore;

/**
 * The scream score of the Pimcore Kingdom coasters: a guest rates a coaster with annual pass number and code, the park
 * sees average, count and the newest comments and can hide a comment or show it again. Plain PHP, no Pimcore calls:
 * the records live behind FeedbackStore, the passes behind AnnualPasses, the failed tries behind FailureCounter.
 *
 * The rules:
 * - the score is a whole number from 1 to 10; anything else is refused, never clamped;
 * - the comment is optional plain text of at most 280 characters, stored as typed (it is escaped where it is shown);
 * - one rating per pass and ride: a second one replaces the first, and the result says so;
 * - `visible` never comes from the guest: a new rating keeps an earlier hide;
 * - the pass is checked first, the store second: a pass number must look like `PK-2026-0001` and its code must
 *   match before FeedbackStore is called. An unknown pass and a wrong code get the same refusal, and an unknown pass
 *   is checked against a dummy hash, so both take as long;
 * - after 5 failed tries per pass or per client key, that pass or client is refused for 15 minutes.
 */
class ScreamScore
{
    /** The portal user group whose members are park staff (created by F316, checked by the park's page, F318). */
    public const STAFF_GROUP = 'Park staff';

    public const MIN_SCORE = 1;

    public const MAX_SCORE = 10;

    public const MAX_COMMENT_LENGTH = 280;

    /** How many visible comments the summary lists, newest first. */
    public const NEWEST_COMMENTS = 5;

    public const MAX_FAILURES = 5;

    /** How long a pass or client is refused after MAX_FAILURES failed tries: 15 minutes. */
    public const LOCK_SECONDS = 900;

    public const PASS_NUMBER_PATTERN = '/^PK-\d{4}-\d{4}$/D';

    /** A ride's stable key: the coaster's file name without `.coaster`, e.g. `thunder-loop`. */
    public const RIDE_PATTERN = '/^[a-z0-9]+(?:-[a-z0-9]+)*$/D';

    /** Checked when a pass is unknown, so that takes as long as a wrong code. No code matches it. */
    public const DUMMY_HASH = '$2y$10$tDdodfU5wJReZ7QG6nShYOs/sDWPEFpMVuO0AWfQKF7tyPB.n.D/q';

    public const REFUSED_PASS = 'Pass number or code is not right.';

    public const REFUSED_LOCKED = 'Too many tries. Try again in 15 minutes.';

    public const REFUSED_SCORE = 'Give a whole number from 1 to 10.';

    public const REFUSED_COMMENT = 'Keep the comment to 280 characters.';

    public const REFUSED_RIDE = 'There is no such ride.';

    /** @var \Closure(): \DateTimeImmutable */
    private readonly \Closure $now;

    /**
     * @param (\Closure(): \DateTimeImmutable)|null $now the clock; the tests pass their own
     */
    public function __construct(
        private readonly FeedbackStore $store,
        private readonly AnnualPasses $passes,
        private readonly FailureCounter $failures,
        ?\Closure $now = null,
    ) {
        $this->now = $now ?? static fn (): \DateTimeImmutable => new \DateTimeImmutable();
    }

    /**
     * A guest's rating of a ride. Stores it, or replaces this pass's earlier rating of the ride, when every field is
     * right; otherwise stores nothing and returns one message per wrong field.
     *
     * @param string $clientKey who is asking, e.g. the client IP; its failed tries count like a pass's
     * @param mixed  $score     must be an int from 1 to 10 (a float or a string is refused)
     * @param mixed  $comment   null, or a string of at most 280 characters
     */
    public function rate(string $ride, string $passNumber, string $code, mixed $score, mixed $comment, string $clientKey): RatingResult
    {
        $errors = [];
        if (preg_match(self::RIDE_PATTERN, $ride) !== 1) {
            $errors['ride'] = self::REFUSED_RIDE;
        }
        if (!is_int($score) || $score < self::MIN_SCORE || $score > self::MAX_SCORE) {
            $errors['score'] = self::REFUSED_SCORE;
        }
        if ($comment === '') {
            $comment = null;
        }
        if ($comment !== null && (!is_string($comment) || mb_strlen($comment, 'UTF-8') > self::MAX_COMMENT_LENGTH)) {
            $errors['comment'] = self::REFUSED_COMMENT;
        }
        $passError = $this->checkPass($passNumber, $code, $clientKey);
        if ($passError !== null) {
            $errors['pass'] = $passError;
        }
        if ($errors !== []) {
            return RatingResult::refused($errors);
        }

        // Only now, with a known pass, does anything reach the store.
        $now = ($this->now)();
        $earlier = $this->store->findByPassAndRide($passNumber, $ride);
        $feedback = $earlier !== null
            ? $earlier->withRating($score, $comment, $now)
            : new GuestFeedback(null, $ride, $score, $comment, $passNumber, true, $now);
        $saved = $this->store->save($feedback);

        return RatingResult::stored((int) $saved->id, $earlier !== null, $earlier?->screamScore);
    }

    /**
     * What the park sees of a ride: the average over all its ratings (hidden ones count) to one decimal, or null with
     * no ratings; the number of ratings; the newest visible comments with score and date; and how many are hidden.
     * No pass numbers.
     *
     * @return array{ride: string, count: int, average: ?float, comments: list<array{id: int, score: int, comment: string, date: string}>, hiddenCount: int}
     */
    public function summary(string $ride): array
    {
        $all = $this->newestFirst($this->store->forRide($ride));
        $count = count($all);
        $sum = array_sum(array_map(static fn (GuestFeedback $f): int => $f->screamScore, $all));
        $visibleComments = array_filter($all, static fn (GuestFeedback $f): bool => $f->visible && $f->comment !== null);

        return [
            'ride' => $ride,
            'count' => $count,
            'average' => $count === 0 ? null : round($sum / $count, 1),
            'comments' => array_map($this->shown(...), array_slice(array_values($visibleComments), 0, self::NEWEST_COMMENTS)),
            'hiddenCount' => count(array_filter($all, static fn (GuestFeedback $f): bool => !$f->visible)),
        ];
    }

    /**
     * The ride's hidden ratings, newest first, for the park's "Show hidden (n)" and "Show again". No pass numbers.
     *
     * @return list<array{id: int, score: int, comment: ?string, date: string}>
     */
    public function hidden(string $ride): array
    {
        $hidden = array_filter($this->newestFirst($this->store->forRide($ride)), static fn (GuestFeedback $f): bool => !$f->visible);

        return array_map($this->shown(...), array_values($hidden));
    }

    /** Hides a rating's comment from the summary; it still counts in average and count. False when there is no such rating. */
    public function hide(int $id): bool
    {
        return $this->setVisible($id, false);
    }

    /** Shows a hidden comment again. False when there is no such rating. */
    public function show(int $id): bool
    {
        return $this->setVisible($id, true);
    }

    /** null when the pass number and code are right, else the refusal. Never touches the store. */
    private function checkPass(string $passNumber, string $code, string $clientKey): ?string
    {
        $wellFormed = preg_match(self::PASS_NUMBER_PATTERN, $passNumber) === 1;
        $keys = ['client:' . $clientKey];
        if ($wellFormed) {
            $keys[] = 'pass:' . $passNumber;
        }
        foreach ($keys as $key) {
            if ($this->failures->failures($key) >= self::MAX_FAILURES) {
                return self::REFUSED_LOCKED;
            }
        }

        $known = false;
        $matches = false;
        if ($wellFormed) {
            $hash = $this->passes->codeHash($passNumber);
            $known = $hash !== null;
            // An unknown pass is checked against the dummy hash, so it takes as long as a wrong code.
            $matches = password_verify($code, $hash ?? self::DUMMY_HASH);
        }
        if ($known && $matches) {
            return null;
        }
        foreach ($keys as $key) {
            $this->failures->recordFailure($key, self::LOCK_SECONDS);
        }

        return self::REFUSED_PASS;
    }

    private function setVisible(int $id, bool $visible): bool
    {
        $feedback = $this->store->find($id);
        if ($feedback === null) {
            return false;
        }
        if ($feedback->visible !== $visible) {
            $this->store->save($feedback->withVisible($visible));
        }

        return true;
    }

    /**
     * @param list<GuestFeedback> $feedback
     *
     * @return list<GuestFeedback>
     */
    private function newestFirst(array $feedback): array
    {
        usort($feedback, static fn (GuestFeedback $a, GuestFeedback $b): int => [$b->createdAt, $b->id] <=> [$a->createdAt, $a->id]);

        return $feedback;
    }

    /** @return array{id: int, score: int, comment: ?string, date: string} */
    private function shown(GuestFeedback $feedback): array
    {
        return [
            'id' => (int) $feedback->id,
            'score' => $feedback->screamScore,
            'comment' => $feedback->comment,
            'date' => $feedback->createdAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
