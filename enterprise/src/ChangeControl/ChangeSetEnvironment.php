<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ChangeControl;

/**
 * What CoasterChangeSet needs from Pimcore and Change Control, about the demo's coaster asset
 * (CoasterDemo::COASTER_FOLDER/COASTER_FILENAME). Metadata entries are the language-neutral ones, by name.
 * PimcoreChangeSetEnvironment is the real one; the tests use an in-memory one.
 */
interface ChangeSetEnvironment
{
    /** The coaster file's content; null if the asset does not exist. */
    public function coasterFile(): ?string;

    /** Uploads a new file onto the asset (the coaster listener fills its five key figures again). */
    public function replaceCoaster(string $content): void;

    /** @return array<string, array{type: string, data: string}> the asset's metadata entries, by name */
    public function metadata(): array;

    /**
     * Sets these entries on the live asset and saves it; other entries stay.
     *
     * @param array<string, array{type: string, data: string}> $entries
     */
    public function saveMetadata(array $entries): void;

    /**
     * The demo's open change sets on the asset (CoasterChangeSet::CONTEXT), newest first, with their coaster entries
     * (named coaster.track...) as proposed and as the base the change set was opened against.
     *
     * @return array<string, array{base: array<string, array{type: string, data: string}>, proposed: array<string, array{type: string, data: string}>}> by change set id
     */
    public function openChangeSets(): array;

    /**
     * Opens a change set on the asset, marked with CoasterChangeSet::CONTEXT, and records these entries into it.
     *
     * @param array<string, array{type: string, data: string}> $entries
     *
     * @return string the change set id
     */
    public function openChangeSet(string $name, array $entries, ?int $userId): string;

    /** Closes the change set without applying it. */
    public function discardChangeSet(string $id, ?int $userId): void;
}
