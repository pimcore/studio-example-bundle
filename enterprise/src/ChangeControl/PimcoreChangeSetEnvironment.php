<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ChangeControl;

use Pimcore\Bundle\ChangeControlBundle\Contract\ChangeControlAuthoringInterface;
use Pimcore\Bundle\ChangeControlBundle\Merge\LeafPath;
use Pimcore\Bundle\ChangeControlBundle\Storage\BranchRepository;
use Pimcore\Bundle\ChangeControlBundle\Storage\Schema;
use Pimcore\Bundle\ChangeControlBundle\Storage\SubjectIdentityRepository;
use Pimcore\Bundle\ChangeControlBundle\Subject\SubjectRef;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo;
use Pimcore\Model\Asset;
use Symfony\Component\Uid\Uuid;

/**
 * ChangeSetEnvironment on Pimcore and Change Control 2026.3. Change sets are opened and recorded through Change
 * Control's authoring facade, ChangeControlAuthoringInterface: open() and recordPatch(), the only way to author a
 * change set on 2026.3 (there is no REST for it). The facade, BranchRepository and SubjectIdentityRepository are
 * marked @internal in ChangeControlBundle: fine for a demo, and the talk says so.
 *
 * The change set is user-authored (created_via 'user', no context ref), so every Studio user who may view the asset
 * sees it in the coaster Review tab; CoasterChangeSet::CONTEXT rides along as its author parameters.
 */
class PimcoreChangeSetEnvironment implements ChangeSetEnvironment
{
    // Change Control's subject type for assets; the subject ref is the asset id.
    private const SUBJECT_TYPE = 'asset';

    // Change Control's state slot for asset metadata: metadata.<name>.<language>, '*' for a language-neutral entry.
    private const METADATA_SLOT = 'metadata';

    private const NEUTRAL_LANGUAGE = '*';

    public function __construct(
        private readonly ChangeControlAuthoringInterface $authoring,
        private readonly BranchRepository $branches,
        private readonly SubjectIdentityRepository $identities,
    ) {
    }

    public function coasterFile(): ?string
    {
        return $this->asset()?->getData();
    }

    public function replaceCoaster(string $content): void
    {
        $asset = $this->asset() ?? throw new \RuntimeException('The coaster asset is gone.');
        $asset->setData($content);
        $asset->save();
    }

    public function metadata(): array
    {
        $entries = [];
        foreach ($this->asset()?->getMetadata(null, null, false, true) ?? [] as $entry) {
            if (in_array($entry['language'] ?? '', ['', null, self::NEUTRAL_LANGUAGE], true)) {
                $entries[$entry['name']] = ['type' => (string) $entry['type'], 'data' => $this->data($entry['data'] ?? '')];
            }
        }

        return $entries;
    }

    public function saveMetadata(array $entries): void
    {
        $asset = $this->asset() ?? throw new \RuntimeException('The coaster asset is gone.');
        foreach ($entries as $name => $entry) {
            $asset->addMetadata($name, $entry['type'], $entry['data']);
        }
        $asset->save();
    }

    public function openChangeSets(): array
    {
        $asset = $this->asset();
        $subject = $asset === null ? null : $this->identities->find(self::SUBJECT_TYPE, (string) $asset->getId());
        if ($subject === null) {
            return [];
        }

        $changeSets = [];
        foreach ($this->branches->findAllForSubject($subject) as $branch) {
            if (!$branch->isOpen() || array_intersect_assoc($branch->context ?? [], CoasterChangeSet::CONTEXT) !== CoasterChangeSet::CONTEXT) {
                continue;
            }
            $states = $this->authoring->subjectStates($branch->uuid);
            $trees = $states[$branch->subject->key()] ?? ['proposed' => [], 'base' => []];
            $changeSets[$branch->uuid->toRfc4122()] = [
                'base' => $this->coasterEntries($trees['base']),
                'proposed' => $this->coasterEntries($trees['proposed']),
            ];
        }

        return $changeSets;
    }

    public function openChangeSet(string $name, array $entries, ?int $userId): string
    {
        $asset = $this->asset() ?? throw new \RuntimeException('The coaster asset is gone.');
        $ref = (string) $asset->getId();
        $subject = new SubjectRef(self::SUBJECT_TYPE, $this->identities->resolve(self::SUBJECT_TYPE, $ref), $ref);

        $branch = $this->authoring->open($subject, $name, Schema::CREATED_VIA_USER, $userId, null, CoasterChangeSet::CONTEXT);

        // one leaf per metadata entry; its stored value is the entry's {type, data}
        $patch = [];
        foreach ($entries as $entryName => $entry) {
            $patch[LeafPath::join([self::METADATA_SLOT, $entryName, self::NEUTRAL_LANGUAGE])] = $entry;
        }
        $this->authoring->recordPatch($branch->uuid, $patch, [], $userId);

        return $branch->uuid->toRfc4122();
    }

    public function discardChangeSet(string $id, ?int $userId): void
    {
        $this->authoring->discard(Uuid::fromString($id), $userId);
    }

    private function asset(): ?Asset
    {
        return Asset::getByPath(CoasterDemo::COASTER_FOLDER . '/' . CoasterDemo::COASTER_FILENAME);
    }

    /**
     * The language-neutral coaster entries of a captured asset tree (metadata: name => language => {type, data}).
     *
     * @return array<string, array{type: string, data: string}>
     */
    private function coasterEntries(array $tree): array
    {
        $entries = [];
        foreach ($tree[self::METADATA_SLOT] ?? [] as $name => $languages) {
            $entry = $languages[self::NEUTRAL_LANGUAGE] ?? null;
            if (is_array($entry) && str_starts_with((string) $name, CoasterChangeSet::TRACK_ENTRY)) {
                $entries[(string) $name] = ['type' => (string) ($entry['type'] ?? ''), 'data' => $this->data($entry['data'] ?? '')];
            }
        }

        return $entries;
    }

    private function data(mixed $data): string
    {
        return is_scalar($data) ? (string) $data : json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
