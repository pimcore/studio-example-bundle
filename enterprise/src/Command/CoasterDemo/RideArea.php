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

    /**
     * The path of the data pool's upload folder (its "upload_folder" setting), or null if it has none. With one, and
     * create on it, the new frontend offers "Upload Folder" in the listing and an Upload button on that screen
     * (DR-F292-1): portal_engine 2026.x shows the button nowhere else.
     */
    public function uploadFolder(int $dataPoolId): ?string;

    /** Sets the data pool's upload folder to $folder (made, and marked, if missing); saves it and clears the cache. */
    public function setUploadFolder(int $dataPoolId, string $folder): void;
}
