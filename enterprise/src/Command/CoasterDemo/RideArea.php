<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * The coasters' own area (F292): the "Ride designs" data pool lists from the ride-designs folder, so the park's page
 * pictures and branding next to it are in no pool the supplier browses. The Portal Engine takes the common path of a
 * data pool's workspaces (its "workspace_definition" block) as the listing root; the wizard puts it on "/". A
 * DemoEnvironment that also implements this gets the area; setup() checks for it, as for ContentPages.
 */
interface RideArea
{
    /** The path of the folder the data pool's first workspace points at ("/" for the asset root), or null if it has none. */
    public function dataPoolRoot(int $dataPoolId): ?string;

    /**
     * Points the data pool's first workspace at $folder (made, and marked as the demo's, if missing); its permissions
     * stay. Saves the data pool and clears the cache that holds its config.
     */
    public function setDataPoolRoot(int $dataPoolId, string $folder): void;

    /**
     * Moves the asset folder under $parent (made, and marked, if missing), under the same name: the same element, so
     * what is in it, its versions and the workspaces pointing at it follow.
     */
    public function moveFolder(string $folder, string $parent): void;
}
