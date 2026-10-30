<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ChangeControl;

/**
 * Demo 2's data: revision 3 of Thunder Loop as a Change Control change set on the coaster asset. Change Control on
 * 2026.3 reviews an asset's metadata, not its file, so revision 3 is recorded as metadata leaves: one entry per changed
 * track value, named as F43's diff names them (coaster.track.loop.1.diameter: 24 -> 30, coaster.track.liftHill.1.height:
 * 45 -> 52), plus the whole element list as the JSON entry coaster.track. The change set is opened against revision 2,
 * the file Demo 1 ends with; its base entries are first written onto the asset, so the review shows old against new.
 *
 * open() is idempotent: an open change set that already holds revision 3 stays, anything else of the demo's is
 * discarded and opened again. discard() drops the demo's open change sets (coaster-demo:reset calls it). Both return
 * what they changed, one line each.
 */
class CoasterChangeSet
{
    public const NAME = 'Thunder Loop revision 3';

    // Marks the demo's change sets in their author context, so open() and discard() never touch anyone else's.
    public const CONTEXT = ['coasterDemo' => 'revision-3'];

    // F43's key scheme (enterprise/assets/shared/coaster/diff/diff.mjs): coaster.track.<type>.<n>.<field>.
    public const TRACK_ENTRY = 'coaster.track';

    public const REVISION_2 = 'thunder-loop-rev2.coaster';

    public const REVISION_3 = 'thunder-loop-rev3.coaster';

    private readonly string $demoDataDir;

    public function __construct(private readonly ChangeSetEnvironment $environment, ?string $demoDataDir = null)
    {
        $this->demoDataDir = $demoDataDir ?? dirname(__DIR__, 2) . '/demo-data';
    }

    /**
     * @param bool $uploadRevision2 upload revision 2 first when the asset holds another file (rehearsing Demo 2 alone)
     *
     * @return string[] what was changed; [] if the change set is open already
     */
    public function open(?int $userId = null, bool $uploadRevision2 = false): array
    {
        $env = $this->environment;
        $changes = [];

        $live = $env->coasterFile()
            ?? throw new \RuntimeException('There is no Thunder Loop coaster asset. Run coaster-demo:setup first.');
        $revision2 = $this->readDemoData(self::REVISION_2);
        if ($this->track($live) !== $this->track($revision2)) {
            if (!$uploadRevision2) {
                throw new \RuntimeException('Thunder Loop is not at revision 2, the file revision 3 is proposed against. Upload revision 2 in the portal (Demo 1), or run with --upload-revision-2.');
            }
            $env->replaceCoaster($revision2);
            $changes[] = 'Uploaded revision 2 of Thunder Loop';
        }

        [$base, $proposed] = $this->revision3();

        $described = array_intersect_key($env->metadata(), $base);
        if ($described != $base) {
            $env->saveMetadata($base);
            $changes[] = sprintf('Described revision 2 as metadata: %s', implode(', ', array_keys($base)));
        }

        $kept = null;
        foreach ($env->openChangeSets() as $id => $changeSet) {
            if ($kept === null && $this->holdsRevision3($changeSet, $base, $proposed)) {
                $kept = $id;
                continue;
            }
            $env->discardChangeSet($id, $userId);
            $changes[] = sprintf('Discarded the outdated change set %s', $id);
        }

        if ($kept === null) {
            $id = $env->openChangeSet(self::NAME, $proposed, $userId);
            $lines = [];
            foreach ($proposed as $name => $entry) {
                $lines[] = $name === self::TRACK_ENTRY ? 'the element list' : sprintf('%s: %s -> %s', $name, $base[$name]['data'], $entry['data']);
            }
            $changes[] = sprintf('Opened the change set "%s" (%s): %s', self::NAME, $id, implode('; ', $lines));
        }

        return $changes;
    }

    /**
     * @return string[] what was discarded
     */
    public function discard(?int $userId = null): array
    {
        $changes = [];
        foreach (array_keys($this->environment->openChangeSets()) as $id) {
            $this->environment->discardChangeSet($id, $userId);
            $changes[] = sprintf('Discarded the change set %s', $id);
        }

        return $changes;
    }

    /**
     * Revision 3 against revision 2 as metadata entries: the base entries (what revision 2 holds) and the proposed
     * ones, with the same names: each changed track value, then the element list.
     *
     * @return array{0: array<string, array{type: string, data: string}>, 1: array<string, array{type: string, data: string}>}
     */
    public function revision3(): array
    {
        $before = $this->track($this->readDemoData(self::REVISION_2));
        $after = $this->track($this->readDemoData(self::REVISION_3));
        if (array_column($before, 'type') !== array_column($after, 'type')) {
            throw new \LogicException('Revision 3 must keep the elements of revision 2: only their values change.');
        }

        $base = [];
        $proposed = [];
        $ordinals = [];
        foreach ($before as $index => $element) {
            $ordinal = $ordinals[$element['type']] = ($ordinals[$element['type']] ?? 0) + 1;
            foreach ($after[$index] as $field => $value) {
                if ($field === 'type' || ($element[$field] ?? null) === $value) {
                    continue;
                }
                $name = sprintf('%s.%s.%d.%s', self::TRACK_ENTRY, $element['type'], $ordinal, $field);
                $base[$name] = ['type' => 'input', 'data' => $this->scalar($element[$field] ?? '')];
                $proposed[$name] = ['type' => 'input', 'data' => $this->scalar($value)];
            }
        }
        $base[self::TRACK_ENTRY] = ['type' => 'textarea', 'data' => $this->json($before)];
        $proposed[self::TRACK_ENTRY] = ['type' => 'textarea', 'data' => $this->json($after)];

        return [$base, $proposed];
    }

    /**
     * An open change set holds revision 3 when its coaster entries are exactly the proposed ones over the base.
     *
     * @param array{base: array<string, array{type: string, data: string}>, proposed: array<string, array{type: string, data: string}>} $changeSet
     */
    private function holdsRevision3(array $changeSet, array $base, array $proposed): bool
    {
        $changed = array_filter($changeSet['proposed'], static fn (array $entry, string $name) => ($changeSet['base'][$name] ?? null) != $entry, ARRAY_FILTER_USE_BOTH);

        return $changed == $proposed && array_intersect_key($changeSet['base'], $base) == $base;
    }

    private function track(string $content): array
    {
        return json_decode($content, true, 512, JSON_THROW_ON_ERROR)['track'] ?? [];
    }

    private function scalar(mixed $value): string
    {
        return is_scalar($value) ? (string) $value : $this->json($value);
    }

    private function json(mixed $value): string
    {
        return json_encode($value, JSON_THROW_ON_ERROR | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function readDemoData(string $file): string
    {
        $content = file_get_contents($this->demoDataDir . '/' . $file);
        if ($content === false) {
            throw new \RuntimeException(sprintf('Cannot read the demo file %s/%s.', $this->demoDataDir, $file));
        }

        return $content;
    }
}
