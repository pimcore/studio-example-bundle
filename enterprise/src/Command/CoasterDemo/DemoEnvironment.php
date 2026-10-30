<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * What the coaster demo needs from Pimcore and the Portal Engine: the demo portal, its brief page, the supplier user
 * and the coaster assets. Reads never write; every method that writes changes exactly one thing. Elements the demo
 * creates are marked as its own, so a full reset removes them and nothing else (PimcoreDemoEnvironment).
 */
interface DemoEnvironment
{
    /** The id of the demo's portal document, or null if there is none. */
    public function portalId(): ?int;

    /** Creates the portal with one asset data pool, through the Portal Engine's wizard, and returns its id. */
    public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int;

    /** The id of the portal's asset data pool document of this name, or null. */
    public function dataPoolId(int $portalId, string $dataPoolName): ?int;

    /** Deletes the portal with all its pages and its site. */
    public function deletePortal(int $portalId): void;

    /** The HTML of the portal's brief page, or null if it has none. */
    public function briefHtml(int $portalId): ?string;

    /** Creates or updates the portal's brief page (a content page beside the data pool, in the navigation). */
    public function saveBrief(int $portalId, string $title, string $html): void;

    /**
     * The portal user with this email, or null:
     * ['email', 'firstname', 'lastname', 'passwordValid' => whether $password is theirs,
     *  'permissions' => [permission => 'allow'|'deny'|...], 'assetWorkspaces' => [folder path => [permission, ...]]].
     */
    public function supplier(string $email, string $password): ?array;

    /**
     * Creates or updates the portal user with $supplier['email']: names, password, the given permissions (others it
     * has stay) and exactly the given asset workspaces. Same keys as supplier(), with 'password' for 'passwordValid'.
     */
    public function saveSupplier(array $supplier): void;

    /** Deletes the portal user if the demo created it. */
    public function deleteSupplier(string $email): void;

    /** The assets in this folder (not its subfolders): [filename => content]; [] if the folder is missing. */
    public function assets(string $folder): array;

    /** Creates the asset (and the folders up to it), as an upload would; the coaster listener fills its metadata. */
    public function createAsset(string $folder, string $filename, string $content): void;

    /** Deletes the asset with its versions. */
    public function deleteAsset(string $folder, string $filename): void;

    /** The asset's metadata: [name => value]; [] if the asset is missing. */
    public function assetMetadata(string $folder, string $filename): array;

    /** Whether the asset folder exists and the demo created it. */
    public function folderExists(string $folder): bool;

    /** Deletes the folder with everything in it if the demo created it. */
    public function deleteFolder(string $folder): void;
}
