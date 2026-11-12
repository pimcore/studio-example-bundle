<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * The portal's start page (F208, DR-P72): the bricks on the portal root document's "content" areablock, which the Studio
 * frontend shows as the portal's home. The demo writes portal_engine's own start-page bricks there (Feature, Hero,
 * Entry tiles) and remembers which bricks are its own, so it never overwrites an editor's start page and a full reset
 * removes only its bricks. A DemoEnvironment that also implements this (and ContentPages, for the tiles' pages) gets
 * the start page; setup() checks for it, as for ContentPages.
 *
 * A brick is a plain array: ['type' => the areabrick id] and its fields. Pictures are asset paths; links are a page
 * setup made: "page:<content page key>" (the brief or a content page) or "data-pool:<data pool name>".
 * - portal-engine-feature: variant, eyebrow, title, description (HTML), image, alt, link => ['page', 'text']
 * - portal-engine-hero: headline, intro
 * - portal-engine-entry-tiles: size, tiles => list of [title, meta, cta, icon, image, link]
 */
interface StartPage
{
    /**
     * The bricks on the portal root's content areablock, in their order: each ['type', 'demo' => whether the demo
     * wrote it] and, for the demo's own, its fields as saveStartPage() took them. [] when the start page is empty.
     *
     * @return list<array<string, mixed>>
     */
    public function startPageBricks(int $portalId): array;

    /**
     * Writes $bricks as the portal root's content areablock, marked as the demo's; the portal's other settings stay.
     * Setup calls it only when every brick there is the demo's.
     *
     * @param list<array<string, mixed>> $bricks
     */
    public function saveStartPage(int $portalId, array $bricks): void;

    /**
     * The portal's frontend variant (portal_engine's "frontend_variant" select on the portal root: "new" is the Studio
     * frontend, the only one that shows these bricks; "old" the legacy one); null or '' when it is not set.
     */
    public function frontendVariant(int $portalId): ?string;

    /** Sets the portal's frontend variant; the portal's other settings stay. Setup calls it only when it is empty. */
    public function setFrontendVariant(int $portalId, string $variant): void;

    /** Removes the demo's bricks from the portal root's content areablock; the others stay as they are. */
    public function removeStartPage(int $portalId): void;
}
