<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\GuestFeedback;

/**
 * What the scream score demo (ScreamScoreDemo) needs from Pimcore and the Portal Engine: the GuestFeedback class, the
 * ratings as its objects, the annual passes' code hashes, the park-staff group and user, and the coaster assets the
 * ratings point at. Like DemoEnvironment: reads never write, every method that writes changes one thing, and only what
 * the demo created is deleted (ScreamScore\Pimcore\PimcoreScreamScoreEnvironment). The tests use an in-memory one.
 *
 * A class field is [type, title]; type is one of relation (many-to-one to an asset), numeric (a whole number),
 * textarea, input, checkbox, datetime.
 */
interface ScreamScoreEnvironment
{
    /** The id of the demo's portal document, or null if there is none (DemoEnvironment::portalId()). */
    public function portalId(): ?int;

    /**
     * The fields of the data object class in its layout's order: [name => [type, title]]; null if there is no class
     * of this name.
     *
     * @return array<string, array{0: string, 1: string}>|null
     */
    public function feedbackClassFields(string $className): ?array;

    /** Creates the class (or updates its fields) with exactly these fields, in this class group. */
    public function saveFeedbackClass(string $className, string $title, string $group, array $fields): void;

    /** Deletes the class with its generated PHP files (var/classes), if no object of it is left. */
    public function deleteFeedbackClass(string $className): void;

    /**
     * The ride keys of the coasters (the .coaster assets under $folder and its subfolders, file name without
     * `.coaster`), sorted.
     *
     * @return list<string>
     */
    public function rides(string $folder): array;

    /** The id of the ride's coaster asset (`<ride>.coaster` under $folder), or null if there is none. */
    public function coasterAssetId(string $folder, string $ride): ?int;

    /**
     * The ratings in the feedback folder: [object key => ['feedback' => GuestFeedback, 'rideAsset' => id of the asset
     * its ride relation points at, or null]].
     *
     * @return array<string, array{feedback: GuestFeedback, rideAsset: ?int}>
     */
    public function ratings(): array;

    /** Saves the rating at its fixed path (PimcoreFeedbackStore::path()), its ride relation on the ride's coaster. */
    public function saveRating(GuestFeedback $feedback): void;

    /** Deletes the rating with this object key from the feedback folder. */
    public function deleteRating(string $key): void;

    /** Whether the demo's feedback folder exists. */
    public function feedbackFolderExists(): bool;

    /** Deletes the feedback folder with everything in it, if the demo created it. */
    public function deleteFeedbackFolder(): void;

    /**
     * The annual passes: [pass number => hash of its code]; null if none are stored.
     *
     * @return array<string, string>|null
     */
    public function passHashes(): ?array;

    /** Stores exactly these passes: [pass number => hash of its code]. */
    public function savePassHashes(array $hashes): void;

    /** Removes the stored passes. */
    public function deletePassHashes(): void;

    /**
     * The portal user group with this name, or null: ['permissions' => [permission => 'allow'|...]].
     *
     * @return array{permissions: array<string, string>}|null
     */
    public function staffGroup(string $name): ?array;

    /** Creates or updates the group with these permissions (others it has stay). */
    public function saveStaffGroup(string $name, array $permissions): void;

    /** Deletes the group if the demo created it. */
    public function deleteStaffGroup(string $name): void;

    /**
     * The portal user with this email, or null: ['email', 'firstname', 'lastname', 'passwordValid' => whether
     * $password is theirs, 'permissions' => [permission => 'allow'|...], 'groups' => [group name, ...]].
     */
    public function staffUser(string $email, string $password): ?array;

    /**
     * Creates or updates the portal user with $user['email']: names, password, the given permissions (others it has
     * stay) and exactly the given groups. Same keys as staffUser(), with 'password' for 'passwordValid'.
     */
    public function saveStaffUser(array $user): void;

    /** Deletes the portal user if the demo created it. */
    public function deleteStaffUser(string $email): void;
}
