<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Note;

use Pimcore\Bundle\PortalEngineBundle\Model\DataObject\PortalUserInterface;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\ProposalStore;

/**
 * The confirmed write: a portal user confirms the Supplier note the agent proposed (F126's ProposalStore), and exactly
 * one note is written. Everything comes from the stored proposal, never from the request. Not PimcoreAgentBundle's
 * proposal pipeline (DR-P27).
 *
 * In order: no such (or an expired) proposal 404; another portal user's 403 (a proposal without an owner matches
 * nobody); already confirmed 409; no `edit` on the asset 403 (still pending); else the note.
 */
class ProposalConfirmer
{
    public function __construct(
        private readonly ProposalStore $proposals,
        private readonly SupplierNoteBackend $notes,
    ) {
    }

    /**
     * @return array{0: int, 1: array<string, mixed>} the HTTP status and the JSON body
     */
    public function confirm(PortalUserInterface $user, string $proposalId): array
    {
        $proposal = $this->proposals->get($proposalId);
        if ($proposal === null) {
            return [404, ['error' => 'There is no such proposal, or it has expired.']];
        }
        $userId = $user->getId();
        $ownerId = $proposal['portalUserId'] ?? null;
        if ($userId === null || !is_int($ownerId) || $ownerId <= 0 || $ownerId !== $userId) {
            return [403, ['error' => 'This proposal belongs to another portal user.']];
        }
        if (isset($proposal['confirmedAt'])) {
            return [409, ['error' => 'This proposal is already confirmed.']];
        }
        if (!$this->notes->mayEdit($user, $proposal['assetId'])) {
            return [403, ['error' => 'This portal user may not edit the revision.']];
        }
        // Claimed before the write, so a second confirm in the meantime gets 409 instead of a second note.
        if (!$this->proposals->markConfirmed($proposalId)) {
            return [409, ['error' => 'This proposal is already confirmed.']];
        }

        try {
            $noteId = $this->notes->writeSupplierNote($proposal['assetId'], $proposal['revision'], self::supplierName($user), $proposal['text']);
        } catch (\Throwable $e) {
            $this->proposals->markPending($proposalId);

            throw $e;
        }

        return [200, [
            'confirmed' => true,
            'noteId' => $noteId,
            'assetId' => $proposal['assetId'],
            'revision' => $proposal['revision'],
        ]];
    }

    /** The supplier's name as the portal shows it: first and last name (never the e-mail). */
    public static function supplierName(PortalUserInterface $user): string
    {
        $name = trim(trim((string) $user->getFirstname()) . ' ' . trim((string) $user->getLastname()));

        return $name !== '' ? $name : 'Supplier';
    }
}
