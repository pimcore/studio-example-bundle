<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\FailureCounter;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\GuestFeedback;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore\PimcoreFeedbackStore;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\ScreamScore;

/**
 * The scream score part of the coaster demo (F316), run by coaster-demo:setup and coaster-demo:reset after CoasterDemo:
 * the GuestFeedback class, the five demo annual passes (demo-data/annual-passes.json, codes as hashes only), the
 * sample ratings (demo-data/scream-score-samples.json) and a park-staff portal user in the group
 * ScreamScore::STAFF_GROUP. Everything goes through ScreamScoreEnvironment, so the tests run it in memory.
 *
 * setup() only adds what is missing and never touches what guests rated; a second run changes nothing. reset() goes
 * back to exactly the sample ratings and clears the lockouts; reset(true) removes it all, the class last.
 */
class ScreamScoreDemo
{
    public const CLASS_NAME = 'GuestFeedback';

    public const CLASS_TITLE = 'Guest feedback';

    public const CLASS_GROUP = 'Coaster demo';

    /** The class's fields, in its layout's order (ScreamScoreEnvironment names the types). */
    public const FIELDS = [
        'ride' => ['relation', 'Ride'],
        'screamScore' => ['numeric', 'Scream score (1-10)'],
        'comment' => ['textarea', 'Comment'],
        'passNumber' => ['input', 'Annual pass number'],
        'visible' => ['checkbox', 'Visible'],
        'createdAt' => ['datetime', 'Created at'],
    ];

    public const PASSES_FILE = 'annual-passes.json';

    public const SAMPLES_FILE = 'scream-score-samples.json';

    /**
     * The plain codes of the demo passes: public demo defaults like the supplier's password, never stored (the data
     * keeps only their hashes). Setup prints them so a presenter can rate live; a real park checks its own passes.
     */
    public const DEMO_PASS_CODES = [
        'PK-2026-0001' => 'scream-0001',
        'PK-2026-0002' => 'scream-0002',
        'PK-2026-0003' => 'scream-0003',
        'PK-2026-0004' => 'scream-0004',
        'PK-2026-0005' => 'scream-0005',
    ];

    /** The park-staff demo login: a demo default, not a secret. The park's page checks the group, not this user. */
    public const STAFF_EMAIL = 'staff@pimcore-kingdom.example';

    public const STAFF_PASSWORD = 'scream-score';

    public const STAFF_FIRSTNAME = 'Park';

    public const STAFF_LASTNAME = 'Staff';

    /** The guest page of a ride (F317): the portal's domain, this path, the ride key. */
    public const GUEST_PATH = '/scream-score/';

    private readonly string $demoDataDir;

    public function __construct(
        private readonly ScreamScoreEnvironment $environment,
        private readonly FailureCounter $failures,
        ?string $demoDataDir = null,
    ) {
        $this->demoDataDir = $demoDataDir ?? dirname(__DIR__, 3) . '/demo-data';
    }

    /**
     * Adds what is missing: the class, the passes, the sample ratings (a missing one, or one whose coaster was
     * uploaded again and so is linked anew), the staff group and the staff user. Runs after CoasterDemo::setup(), which
     * makes the portal and uploads the coaster.
     *
     * @return string[] one plain line per thing it made or changed; [] if all was there
     */
    public function setup(): array
    {
        $env = $this->environment;
        $changes = [];
        // First, so a broken data file stops setup before it changes anything.
        $passes = $this->passHashes();
        $samples = $this->samples();
        $portalId = $env->portalId()
            ?? throw new \RuntimeException(sprintf('There is no "%s" portal for the park staff. Run coaster-demo:setup, which makes it first.', CoasterDemo::PORTAL_NAME));

        $fields = $env->feedbackClassFields(self::CLASS_NAME);
        if ($fields !== self::FIELDS) {
            $env->saveFeedbackClass(self::CLASS_NAME, self::CLASS_TITLE, self::CLASS_GROUP, self::FIELDS);
            $changes[] = $fields === null
                ? sprintf('Created the data object class "%s" (%s) in the group "%s"', self::CLASS_NAME, self::CLASS_TITLE, self::CLASS_GROUP)
                : sprintf('Updated the fields of the data object class "%s"', self::CLASS_NAME);
        }

        if ($env->passHashes() !== $passes) {
            $env->savePassHashes($passes);
            $changes[] = sprintf('Stored the %d demo annual passes %s (their codes as hashes only)', count($passes), implode(', ', array_keys($passes)));
        }

        $ratings = $env->ratings();
        $written = [];
        foreach ($samples as $key => $sample) {
            $there = $ratings[$key] ?? null;
            $asset = $env->coasterAssetId(PimcoreFeedbackStore::RIDES_FOLDER, $sample->ride);
            if ($there === null) {
                $env->saveRating($sample);
                $written[] = $key;
            } elseif ($there['rideAsset'] !== $asset) {
                // The coaster was uploaded again (reset): the same rating, linked to the new asset.
                $env->saveRating($there['feedback']);
                $written[] = $key;
            }
        }
        if ($written !== []) {
            $changes[] = sprintf('Wrote the sample ratings %s to %s', implode(', ', $written), PimcoreFeedbackStore::FOLDER);
        }

        $permissions = [CoasterDemo::PORTAL_ACCESS . $portalId => 'allow'];
        $group = $env->staffGroup(ScreamScore::STAFF_GROUP);
        if ($group === null || array_intersect_assoc($permissions, $group['permissions']) !== $permissions) {
            $env->saveStaffGroup(ScreamScore::STAFF_GROUP, $permissions);
            $changes[] = sprintf('Set up the portal user group "%s" with access to the portal "%s"', ScreamScore::STAFF_GROUP, CoasterDemo::PORTAL_NAME);
        }

        $user = $env->staffUser(self::STAFF_EMAIL, self::STAFF_PASSWORD);
        if (!self::staffMatches($user, $permissions)) {
            $env->saveStaffUser([
                'email' => self::STAFF_EMAIL,
                'firstname' => self::STAFF_FIRSTNAME,
                'lastname' => self::STAFF_LASTNAME,
                'password' => self::STAFF_PASSWORD,
                'permissions' => $permissions,
                'groups' => [ScreamScore::STAFF_GROUP],
            ]);
            $changes[] = sprintf('Set up the park-staff user %s %s (%s) in the group "%s"', self::STAFF_FIRSTNAME, self::STAFF_LASTNAME, self::STAFF_EMAIL, ScreamScore::STAFF_GROUP);
        }

        return $changes;
    }

    /**
     * Back to the sample ratings: deletes every rating a guest added, puts a changed sample back, clears the failed
     * pass checks (so no pass or guest stays locked out), then repairs the rest like setup(). Runs after
     * CoasterDemo::reset(), so the samples point at the coaster it uploaded again.
     *
     * With $removeAll, back to the state before setup: the ratings, the passes, the staff user and its group, then the
     * class with its generated files. Runs before CoasterDemo::reset(true), which deletes the portal.
     *
     * @return string[] what was changed
     */
    public function reset(bool $removeAll = false): array
    {
        return $removeAll ? $this->removeAll() : [...$this->backToSamples(), ...$this->setup()];
    }

    /**
     * The guest link of each coaster (F317's page), by ride key: it stays the same when reset uploads the coaster again.
     *
     * @return array<string, string> ride key => link
     */
    public function guestLinks(string $domain): array
    {
        $links = [];
        foreach ($this->environment->rides(PimcoreFeedbackStore::RIDES_FOLDER) as $ride) {
            $links[$ride] = 'http://' . $domain . self::GUEST_PATH . rawurlencode($ride);
        }

        return $links;
    }

    /**
     * The demo passes with their codes, the ones without a sample rating first: free for a live try.
     *
     * @return array<string, string> pass number => code
     */
    public function demoPasses(): array
    {
        $rated = array_map(static fn (GuestFeedback $f): string => $f->passNumber, $this->samples());
        $free = array_diff_key(self::DEMO_PASS_CODES, array_flip($rated));

        return [...$free, ...array_intersect_key(self::DEMO_PASS_CODES, array_flip($rated))];
    }

    /** @return string[] */
    private function backToSamples(): array
    {
        $env = $this->environment;
        $changes = [];
        $samples = $this->samples();
        $dropped = [];
        $restored = [];
        foreach ($env->ratings() as $key => $there) {
            $sample = $samples[$key] ?? null;
            if ($sample === null) {
                $env->deleteRating((string) $key);
                $dropped[] = $key;
            } elseif (!self::sameRating($there['feedback'], $sample)) {
                $env->saveRating($there['feedback']->id === null ? $sample : $sample->withId($there['feedback']->id));
                $restored[] = $key;
            }
        }
        if ($dropped !== []) {
            $changes[] = sprintf('Deleted the guest ratings %s', implode(', ', $dropped));
        }
        if ($restored !== []) {
            $changes[] = sprintf('Put back the sample ratings %s', implode(', ', $restored));
        }
        $this->failures->clear();
        $changes[] = 'Cleared the failed pass checks: no pass or guest is locked out';

        return $changes;
    }

    /** @return string[] */
    private function removeAll(): array
    {
        $env = $this->environment;
        $changes = [];
        $ratings = array_keys($env->ratings());
        foreach ($ratings as $key) {
            $env->deleteRating((string) $key);
        }
        if ($ratings !== []) {
            $changes[] = sprintf('Deleted the %d ratings in %s', count($ratings), PimcoreFeedbackStore::FOLDER);
        }
        if ($env->feedbackFolderExists()) {
            $env->deleteFeedbackFolder();
            $changes[] = sprintf('Deleted the data object folder %s', PimcoreFeedbackStore::FOLDER);
        }
        if ($env->passHashes() !== null) {
            $env->deletePassHashes();
            $changes[] = 'Deleted the demo annual passes';
        }
        $this->failures->clear();
        if ($env->staffUser(self::STAFF_EMAIL, self::STAFF_PASSWORD) !== null) {
            $env->deleteStaffUser(self::STAFF_EMAIL);
            $changes[] = sprintf('Deleted the park-staff user %s', self::STAFF_EMAIL);
        }
        if ($env->staffGroup(ScreamScore::STAFF_GROUP) !== null) {
            $env->deleteStaffGroup(ScreamScore::STAFF_GROUP);
            $changes[] = sprintf('Deleted the portal user group "%s"', ScreamScore::STAFF_GROUP);
        }
        // last: a class goes only when no object of it is left
        if ($env->feedbackClassFields(self::CLASS_NAME) !== null) {
            $env->deleteFeedbackClass(self::CLASS_NAME);
            $changes[] = sprintf('Deleted the data object class "%s" with its generated class files', self::CLASS_NAME);
        }

        return $changes;
    }

    /**
     * The passes of demo-data/annual-passes.json: [pass number => code hash], every number like PK-2026-0001 and
     * every hash a password_hash() one (a plain code there is refused).
     *
     * @return array<string, string>
     */
    public function passHashes(): array
    {
        $data = $this->readJson(self::PASSES_FILE);
        $hashes = [];
        foreach ((array) ($data['passes'] ?? []) as $pass) {
            $number = (string) ($pass['passNumber'] ?? '');
            $hash = (string) ($pass['codeHash'] ?? '');
            if (preg_match(ScreamScore::PASS_NUMBER_PATTERN, $number) !== 1 || password_get_info($hash)['algo'] === null) {
                throw new \RuntimeException(sprintf('demo-data/%s: every pass needs a passNumber like PK-2026-0001 and a codeHash from password_hash().', self::PASSES_FILE));
            }
            $hashes[$number] = $hash;
        }

        return $hashes;
    }

    /**
     * The ratings of demo-data/scream-score-samples.json, by their object key.
     *
     * @return array<string, GuestFeedback>
     */
    public function samples(): array
    {
        $samples = [];
        foreach ((array) ($this->readJson(self::SAMPLES_FILE)['ratings'] ?? []) as $rating) {
            $feedback = new GuestFeedback(
                null,
                (string) $rating['ride'],
                (int) $rating['screamScore'],
                isset($rating['comment']) ? (string) $rating['comment'] : null,
                (string) $rating['passNumber'],
                (bool) $rating['visible'],
                new \DateTimeImmutable((string) $rating['createdAt']),
            );
            $samples[PimcoreFeedbackStore::key($feedback->ride, $feedback->passNumber)] = $feedback;
        }

        return $samples;
    }

    private static function sameRating(GuestFeedback $a, GuestFeedback $b): bool
    {
        return [$a->ride, $a->passNumber, $a->screamScore, $a->comment, $a->visible, $a->createdAt->getTimestamp()]
            === [$b->ride, $b->passNumber, $b->screamScore, $b->comment, $b->visible, $b->createdAt->getTimestamp()];
    }

    /** @param array<string, string> $permissions */
    private static function staffMatches(?array $user, array $permissions): bool
    {
        return $user !== null
            && $user['passwordValid']
            && $user['firstname'] === self::STAFF_FIRSTNAME
            && $user['lastname'] === self::STAFF_LASTNAME
            && $user['groups'] === [ScreamScore::STAFF_GROUP]
            && array_intersect_assoc($permissions, $user['permissions']) === $permissions;
    }

    private function readJson(string $file): array
    {
        $path = $this->demoDataDir . '/' . $file;
        $json = is_file($path) ? file_get_contents($path) : false;
        $data = $json === false ? null : json_decode($json, true);
        if (!is_array($data)) {
            throw new \RuntimeException(sprintf('demo-data/%s is missing or not valid JSON.', $file));
        }

        return $data;
    }
}
