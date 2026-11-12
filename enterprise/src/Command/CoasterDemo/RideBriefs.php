<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

/**
 * The park's open ride briefs (F293): a data object class "Ride brief", the briefs as its objects in a park folder, and
 * a data-object data pool "Open briefs" in the portal's navigation that lists them, view only. It replaces the content
 * page "Brief: Thunder Loop". A DemoEnvironment that also implements this (and ContentPages) gets the briefs; setup()
 * checks for it, as for RideArea.
 *
 * A field is [type, title] or, for a select, [type, title, [value => label]]; type is one of input, numeric, select,
 * textarea (Pimcore's data types of those names).
 */
interface RideBriefs
{
    /**
     * The fields of the data object class, in its layout's order: [name => [type, title(, options)]]; null if there is
     * no class of this name.
     *
     * @return array<string, array>|null
     */
    public function briefClassFields(string $className): ?array;

    /**
     * Creates the class (or updates its fields) with exactly these fields in one panel, and the portal's detail layout
     * of the same fields (a data-object data pool's detail page shows a custom layout only).
     */
    public function saveBriefClass(string $className, string $title, array $fields): void;

    /** Deletes the class and its portal layout, if no object of it is left. */
    public function deleteBriefClass(string $className): void;

    /**
     * The objects of the class in this data object folder (not its subfolders): [key => [field => value]]; [] if the
     * folder is missing.
     *
     * @return array<string, array<string, mixed>>
     */
    public function briefs(string $className, string $folder): array;

    /** Creates or updates the published object $key in $folder (the folders made, and marked, if missing). */
    public function saveRideBrief(string $className, string $folder, string $key, array $values): void;

    /** Whether the data object folder exists and the demo created it (or something in it). */
    public function objectFolderExists(string $folder): bool;

    /** Deletes the data object folder with everything in it if the demo created it; else only the demo's children. */
    public function deleteObjectFolder(string $folder): void;

    /**
     * The portal's data-object data pool of this name, or null: ['id', 'class' => its data object class name,
     * 'root' => the folder its first workspace points at, 'icon' => its navigation icon, 'permissions' => the first
     * workspace's permissions (view, download, ...), 'after' => the name of the data pool or page before it in the
     * navigation, or null when it is first].
     */
    public function briefsPool(int $portalId, string $name): ?array;

    /**
     * Creates or updates the data-object data pool $name: its class, its detail layout, one workspace on $folder with
     * exactly $permissions, its navigation icon; placed in the navigation right after the data pool $afterDataPoolId.
     * Saves it, clears the cache that holds its config and returns its id.
     */
    public function saveBriefsPool(int $portalId, string $name, string $className, string $folder, string $icon, array $permissions, int $afterDataPoolId): int;

    /** Deletes the demo's own content page with this key (ContentPages::contentPage()), if there is one. */
    public function deleteContentPage(int $portalId, string $key): void;
}
