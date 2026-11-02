<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Note;

use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;

/**
 * What the confirmed write needs from Pimcore and the Portal Engine: the `edit` check, the Supplier note itself, and the
 * demo reset. PimcoreSupplierNoteBackend is the real one; the tests use an in-memory one.
 */
interface SupplierNoteBackend
{
    /** The Pimcore note type of the agent demo's notes; the reset removes notes of this type only. */
    public const NOTE_TYPE = 'Supplier note';

    /** Whether the signed-in portal user may edit the asset in the demo portal's data pool. */
    public function mayEdit(PortalUserInterface $user, int $assetId): bool;

    /**
     * Writes one Supplier note on the asset, without a Pimcore author (the supplier's name is in the note's data).
     *
     * @return int the note's id
     */
    public function writeSupplierNote(int $assetId, int $revision, string $supplierName, string $text): int;

    /**
     * The demo's fixture assets: every asset under the park's asset folder.
     *
     * @return list<int>
     */
    public function demoAssetIds(): array;

    /**
     * Removes the notes of type NOTE_TYPE on these assets, and no other note.
     *
     * @param list<int> $assetIds
     *
     * @return int how many were removed
     */
    public function removeSupplierNotes(array $assetIds): int;
}
