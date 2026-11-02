<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent;

/**
 * What the agent may do for a portal user, and nothing more: read the Thunder Loop brief, list the .coaster revisions
 * the user may view, and propose a Supplier note on one of them. The user comes from PortalUserContext; without one
 * every read returns nothing and the proposal is refused. A proposal is only stored (ProposalStore), never written.
 *
 * Plain PHP with no PimcoreAgentBundle class, so the portal's replay route (F127) uses it without the bundle; the MCP
 * tools in Tools/ only wrap it for the bundle's `kingdom-portal` group.
 */
class KingdomBriefTools
{
    public const MAX_NOTE_LENGTH = 2000;

    public function __construct(
        private readonly PortalUserContext $context,
        private readonly KingdomSource $source,
        private readonly ProposalStore $proposals,
    ) {
    }

    /** The brief's text, or null without a portal user (or without a brief). */
    public function readBrief(): ?string
    {
        return $this->context->portalUser() === null ? null : $this->source->briefText();
    }

    /**
     * The .coaster revisions the portal user may view; [] without a portal user. No paths, e-mails or user ids.
     *
     * @return list<array{assetId: int, revision: int, maxHeightM: ?float, lengthM: ?float}>
     */
    public function listRevisions(): array
    {
        $user = $this->context->portalUser();
        if ($user === null) {
            return [];
        }

        $visible = [];
        $revisions = [];
        foreach ($this->source->coasterRevisions() as $revision) {
            $assetId = $revision['assetId'];
            $visible[$assetId] ??= $this->source->mayView($user, $assetId);
            if ($visible[$assetId]) {
                $revisions[] = [
                    'assetId' => $assetId,
                    'revision' => $revision['revision'],
                    'maxHeightM' => $revision['maxHeightM'],
                    'lengthM' => $revision['lengthM'],
                ];
            }
        }

        return $revisions;
    }

    /**
     * Stores a pending Supplier note for the portal user on a revision it may view; writes no note.
     *
     * @return array{proposalId: string, expiresInSeconds: int}
     *
     * @throws NoPortalUserException without a portal user, or for a revision the user may not view
     * @throws \InvalidArgumentException for an empty or too long text
     */
    public function proposeSupplierNote(int $assetId, int $revision, string $text): array
    {
        $user = $this->context->portalUser();
        if ($user === null) {
            throw new NoPortalUserException('Only a signed-in portal user can propose a Supplier note.');
        }
        $text = trim($text);
        if ($text === '' || mb_strlen($text) > self::MAX_NOTE_LENGTH) {
            throw new \InvalidArgumentException(sprintf('The note needs 1 to %d characters.', self::MAX_NOTE_LENGTH));
        }
        $known = array_filter(
            $this->listRevisions(),
            static fn (array $r) => $r['assetId'] === $assetId && $r['revision'] === $revision,
        );
        if (!$known) {
            throw new NoPortalUserException('There is no such revision for this portal user.');
        }

        return [
            'proposalId' => $this->proposals->add((int) $user->getId(), $assetId, $revision, $text),
            'expiresInSeconds' => $this->proposals->ttl(),
        ];
    }
}
