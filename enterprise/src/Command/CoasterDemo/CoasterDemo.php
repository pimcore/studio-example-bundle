<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\StudioExampleEnterprisePortalPlugin;

/**
 * Demo 1's state: the Pimcore Kingdom portal with a "Ride designs" asset data pool and the example portal
 * plugin enabled, the park's open ride briefs as data objects in an "Open briefs" data pool (F293; the brief page where an environment has no RideBriefs) and three pages for suppliers (About the park, Working with the Kingdom, Safety
 * first) as content pages in it, each with its navigation icon, the Loopwerk Engineering supplier with a public demo login, and revision 1 of Thunder Loop uploaded with its
 * metadata, and the park's own logo and brand colours on the portal, an English text for the asset tree's first line, and the small "Talk" link at the end of the portal footer (F157), and a start page on the portal root (F208): portal_engine's Feature (the park picture), Hero and large Entry tiles to the brief, the ride designs and the content pages. setup() creates what is missing and leaves what is there, so a second run changes nothing; reset() goes
 * back to revision 1 (or, with $removeAll, to the state before setup). Both return what they changed, one line each.
 */
class CoasterDemo
{
    public const PORTAL_NAME = 'Pimcore Kingdom';

    // The park's earlier names (DR-P22): setup renames a marked portal and asset folder under them in place, and
    // reset --all removes a folder under them too.
    public const LEGACY_PARK_NAMES = ['Theme Park of Tomorrow'];

    public const DEFAULT_DOMAIN = 'portal.localhost';

    public const LANGUAGE = 'en';

    public const DATA_POOL_NAME = 'Ride designs';

    public const BRIEF_TITLE = 'Brief: Thunder Loop';

    public const BRIEF_KEY = 'brief';

    // Navigation icons (F155): names from portal_engine's bundled icon set (its assets/icons, which the portal's rail
    // reads; tests/coaster-content-pages.test.mjs checks each one there). Without one the rail shows its generic icon.
    public const DATA_POOL_ICON = 'drafting-compass.svg';

    public const BRIEF_ICON = 'clipboard-list.svg';

    public const ABOUT_ICON = 'landmark.svg';

    public const WORKING_ICON = 'handshake.svg';

    public const SAFETY_ICON = 'shield-alt.svg';

    // The content pages for suppliers (DR-P48 part 4), after the brief in the navigation: [key => [title, icon]], the
    // text of each in demo-data/pages/<key>.md. Fictional Pimcore Kingdom text; the list is Marvin's to change.
    public const CONTENT_PAGES = [
        'about-the-park' => ['About the park', self::ABOUT_ICON],
        'working-with-the-kingdom' => ['Working with the Kingdom', self::WORKING_ICON],
        'safety-first' => ['Safety first', self::SAFETY_ICON],
    ];

    // The park's open ride briefs (F293, RideBriefs): a data object class, the briefs in demo-data/open-briefs.json as its
    // objects in a park folder, and a data-object data pool listing them, view only. The pool replaces the content page
    // "Brief: Thunder Loop" in the navigation (right after the ride designs) and on the start page's brief tile.
    public const BRIEF_CLASS = 'RideBrief';

    public const BRIEF_CLASS_TITLE = 'Ride brief';

    // [name => [type, title(, [value => label])]], in the detail page's order (RideBriefs).
    public const BRIEF_FIELDS = [
        'title' => ['input', 'Title'],
        'rideType' => ['input', 'Ride type'],
        'maxHeight' => ['numeric', 'Max height (m)'],
        'maxLength' => ['numeric', 'Max length (m)'],
        'inversionsAllowed' => ['numeric', 'Inversions allowed'],
        'targetOpening' => ['input', 'Target opening'],
        'status' => ['select', 'Status', ['open' => 'Open', 'closed' => 'Closed']],
        'description' => ['textarea', 'Description'],
    ];

    public const BRIEFS_FILE = 'open-briefs.json';

    public const BRIEFS_POOL_NAME = 'Open briefs';

    public const BRIEFS_ICON = self::BRIEF_ICON;

    // A data object folder (not an asset folder) of the park's name.
    public const BRIEFS_FOLDER = self::ASSET_ROOT . '/Open briefs';

    // The supplier browses the briefs: view, nothing more (no edit, no apply).
    public const BRIEFS_PERMISSIONS = ['view'];

    // The brief the Ask the brief agent reads (KingdomSource::briefText()).
    public const THUNDER_LOOP_BRIEF = 'Thunder Loop';

    // The start page (F208, DR-P72): its text in demo-data/start-page.md, its pictures the pages' files in pages/img.
    // portal_engine's own Studio start-page bricks, in this order; the tiles' variant and the feature's colour are the
    // bricks' own options, so the page has the portal's design and no CSS of the demo's.
    public const START_PAGE_FILE = 'start-page.md';

    public const FEATURE_BRICK = 'portal-engine-feature';

    public const HERO_BRICK = 'portal-engine-hero';

    public const TILES_BRICK = 'portal-engine-entry-tiles';

    public const FEATURE_VARIANT = 'gradient';
    // portal_engine's FrontendVariantService::VARIANT_NEW: the Studio frontend (PORTAL_STUDIO), the only one that
    // renders the start-page bricks. Setup sets it on a portal without one (F211), so a fresh portal shows the page.
    public const FRONTEND_VARIANT = 'new';

    public const TILES_SIZE = 'large';

    // The tile of the data pool in start-page.md ("## Tile: ride-designs"); the others are named by their page key.
    public const DATA_POOL_TILE = 'ride-designs';

    // The public demo login: shown on stage and in the runbook, so it is no secret.
    public const SUPPLIER_EMAIL = 'supplier@loopwerk.example';

    public const SUPPLIER_PASSWORD = 'thunder-loop';

    public const SUPPLIER_FIRSTNAME = 'Loopwerk';

    public const SUPPLIER_LASTNAME = 'Engineering';

    // The park's asset folder; everything the demo uploads lives below it.
    public const ASSET_ROOT = '/' . self::PORTAL_NAME;

    // The coasters' own area (F292): the "Ride designs" data pool lists from here (RideArea), so the page pictures and
    // the branding next to it are in no pool the supplier browses; every ride's folder lives below it.
    public const RIDE_DESIGNS_FOLDER = self::ASSET_ROOT . '/Ride designs';

    // The supplier's asset workspace (F134): only the ride designs, not the park's Branding folder.
    public const COASTER_FOLDER = self::RIDE_DESIGNS_FOLDER . '/Thunder Loop';

    // Where Thunder Loop was before F292, at the park root: setup moves a folder there in place.
    public const LEGACY_COASTER_FOLDER = self::ASSET_ROOT . '/Thunder Loop';

    public const COASTER_FILENAME = 'thunder-loop.coaster';

    public const REVISION_1 = 'thunder-loop-rev1.coaster';

    // The content pages' pictures (F160): the files their image lines name, in demo-data/pages/img, uploaded as plain
    // assets (served as they are) into this folder; the supplier may view it, nothing more.
    public const PAGES_FOLDER = self::ASSET_ROOT . '/Pages';

    public const PAGE_IMAGES_DIR = 'pages/img';

    public const PAGES_PERMISSIONS = ['view'];

    // The park's branding (DR-P22): an own-made logo in demo-data/branding, uploaded here and set as the portal's
    // logo (the SVG: the header inlines it in brand_primary; the PNG is for thumbnails and e-mails).
    public const BRANDING_FOLDER = self::ASSET_ROOT . '/Branding';

    public const LOGO_SVG = 'pimcore-kingdom-logo.svg';

    public const LOGO_PNG = 'pimcore-kingdom-logo.png';

    // The slides' palette (DR-P39, F145): Pimcore Purple (purple-600 of the deck's brand tokens) for actions, and its
    // purple-700 shade, the deck's hover/pressed purple, as the accent (the portal's hover ring). White text on either,
    // and either as text on the light header, is at least 4.5:1 (tests/coaster-branding.test.mjs), so both read on a
    // projector. Lato stays: the deck's Gilroy is licence-bound and this bundle is public.
    public const BRAND_PRIMARY = '#6428b4';

    public const BRAND_ACCENT = '#502090';

    // The asset tree's first line in the portal (F135, spike F105 P2): the frontend reads this key in this domain. A
    // 2026.3 ships "/ (root)" for it; an older 2026.x install has no text and shows the raw key. Setup adds the text
    // only where it is missing or empty, so an edited text stays.
    public const TRANSLATION_DOMAIN = 'portal_engine_frontend';

    public const ROOT_FOLDER_KEY = 'portal-engine.listing.root-folder';

    public const ROOT_FOLDER_TEXT = 'All ride designs';

    // Portal Engine permission keys (Pimcore\Bundle\PortalEngineBundle\Enum\Permission): <permission>___<document id>.
    public const PORTAL_ACCESS = 'portal-access___';

    public const DATA_POOL_ACCESS = 'data-pool-access___';

    // The Upload Folder screen lists every contributor's files only with this, else only the user's own (F292), so the
    // supplier sees revision 1 next to an upload.
    public const UPLOAD_FOLDER_REVIEWING = 'asset-upload-folder-reviewing___';

    // What the supplier may do in the asset workspace: everything an upload and its edits need.
    public const WORKSPACE_PERMISSIONS = ['view', 'download', 'edit', 'update', 'create', 'delete', 'subfolder'];

    // Set by the coaster listener (src/Coaster/CoasterMetadataListener.php) on upload.
    public const METADATA = ['maxHeight', 'length', 'inversions', 'topSpeed', 'duration'];

    private readonly string $demoDataDir;

    public function __construct(private readonly DemoEnvironment $environment, ?string $demoDataDir = null)
    {
        $this->demoDataDir = $demoDataDir ?? dirname(__DIR__, 3) . '/demo-data';
    }

    /**
     * @return string[] what was changed; [] if the demo was set up already
     */
    public function setup(string $domain = self::DEFAULT_DOMAIN): array
    {
        $changes = [];
        $env = $this->environment;
        // First, so a page naming a missing image or one without alt text stops setup before it changes anything.
        $pagesHtml = $this->pagesHtml();
        $startPage = $this->hasStartPage() ? $this->startPage() : null;

        $portalId = $env->portalId();
        $created = $portalId === null;
        if ($created) {
            $portalId = $env->createPortal(self::PORTAL_NAME, $domain, self::LANGUAGE, self::DATA_POOL_NAME);
            $changes[] = sprintf('Created the portal "%s" on %s with the data pool "%s"', self::PORTAL_NAME, $domain, self::DATA_POOL_NAME);
        } else {
            // The portal is found by its mark, not its name: one set up under an earlier name is renamed, not doubled.
            $name = $env->portalName($portalId);
            if ($name !== self::PORTAL_NAME) {
                $env->renamePortal($portalId, self::PORTAL_NAME);
                $changes[] = sprintf('Renamed the portal "%s" to "%s"', $name ?? '(no portal name)', self::PORTAL_NAME);
            }
        }
        // Before the supplier step, so its workspace (which points at the folder) is already right.
        if (!$env->folderExists(self::ASSET_ROOT)) {
            foreach (self::legacyAssetRoots() as $legacy) {
                if ($env->folderExists($legacy)) {
                    $env->renameFolder($legacy, self::PORTAL_NAME);
                    $changes[] = sprintf('Renamed the folder %s to %s', $legacy, self::ASSET_ROOT);
                    break;
                }
            }
        }

        // Without it in "Enabled plugins" the portal loads none of the example's portal code (coaster tile, preview).
        // On a new portal it is part of creating it; on an existing one it is a change of its own.
        if (!in_array(StudioExampleEnterprisePortalPlugin::ID, $env->enabledPlugins($portalId), true)) {
            $env->enablePlugin($portalId, StudioExampleEnterprisePortalPlugin::ID);
            if (!$created) {
                $changes[] = sprintf('Enabled the plugin "%s" on the portal "%s"', StudioExampleEnterprisePortalPlugin::ID, self::PORTAL_NAME);
            }
        }
        $dataPoolId = $env->dataPoolId($portalId, self::DATA_POOL_NAME)
            ?? throw new \RuntimeException(sprintf('The portal "%s" has no asset data pool "%s". Run coaster-demo:reset --all, then setup again.', self::PORTAL_NAME, self::DATA_POOL_NAME));

        if ($env instanceof RideArea) {
            $changes = [...$changes, ...$this->rideArea($env, $dataPoolId)];
        }

        // Before the pages, so the images their HTML points at are there when it is saved.
        $changes = [...$changes, ...$this->pageImages()];

        if ($env instanceof ContentPages) {
            $changes = [...$changes, ...$this->contentPages($env, $portalId, $dataPoolId, $pagesHtml)];
        } else {
            $brief = $pagesHtml[self::BRIEF_KEY];
            if (!self::sameHtml($env->briefHtml($portalId), $brief)) {
                $env->saveBrief($portalId, self::BRIEF_TITLE, $brief);
                $changes[] = sprintf('Wrote the brief page "%s"', self::BRIEF_TITLE);
            }
        }

        $briefsPoolId = null;
        if ($this->hasBriefs()) {
            /** @var RideBriefs&ContentPages $env */
            [$briefsPoolId, $briefChanges] = $this->briefs($env, $portalId, $dataPoolId);
            $changes = [...$changes, ...$briefChanges];
        }

        if ($startPage !== null) {
            /** @var StartPage $env */
            $changes = [...$changes, ...$this->startPageStep($env, $portalId, $startPage)];
            $changes = [...$changes, ...$this->frontendVariantStep($env, $portalId)];
        }

        $supplier = $this->supplier($portalId, $dataPoolId, $briefsPoolId);
        if (!$this->supplierMatches($env->supplier(self::SUPPLIER_EMAIL, self::SUPPLIER_PASSWORD), $supplier)) {
            $env->saveSupplier($supplier);
            $changes[] = sprintf('Set up the supplier %s %s (%s)', self::SUPPLIER_FIRSTNAME, self::SUPPLIER_LASTNAME, self::SUPPLIER_EMAIL);
        }

        $changes = [...$changes, ...$this->brand($portalId)];

        if ($env instanceof PortalFooter) {
            $changes = [...$changes, ...$this->footer($env, $portalId)];
        }

        if (($env->translation(self::TRANSLATION_DOMAIN, self::ROOT_FOLDER_KEY, self::LANGUAGE) ?? '') === '') {
            $env->saveTranslation(self::TRANSLATION_DOMAIN, self::ROOT_FOLDER_KEY, self::LANGUAGE, self::ROOT_FOLDER_TEXT);
            $changes[] = sprintf('Added the English text "%s" for %s', self::ROOT_FOLDER_TEXT, self::ROOT_FOLDER_KEY);
        }

        // Only a missing coaster is uploaded: setup never overwrites what the demo uploaded; reset does.
        if (!array_key_exists(self::COASTER_FILENAME, $env->assets(self::COASTER_FOLDER))) {
            $env->createAsset(self::COASTER_FOLDER, self::COASTER_FILENAME, $this->revision1());
            $changes[] = sprintf('Uploaded revision 1 as %s/%s', self::COASTER_FOLDER, self::COASTER_FILENAME);
        }
        $missing = array_diff(self::METADATA, array_keys($env->assetMetadata(self::COASTER_FOLDER, self::COASTER_FILENAME)));
        if ($missing !== []) {
            throw new \RuntimeException(sprintf('%s/%s has no metadata %s: is the coaster listener (config/coaster.yaml) registered?', self::COASTER_FOLDER, self::COASTER_FILENAME, implode(', ', $missing)));
        }

        return $changes;
    }

    /**
     * Back to revision 1: removes everything else the demo uploaded, replaces a changed coaster with a fresh revision 1
     * (no version history), then repairs the rest like setup(). With $removeAll, back to the state before setup:
     * removes the supplier, the demo's assets and the portal.
     *
     * @return string[] what was changed; [] if there was nothing to reset
     */
    public function reset(bool $removeAll = false, string $domain = self::DEFAULT_DOMAIN): array
    {
        $env = $this->environment;
        $changes = [];

        if ($removeAll) {
            if ($env->supplier(self::SUPPLIER_EMAIL, self::SUPPLIER_PASSWORD) !== null) {
                $env->deleteSupplier(self::SUPPLIER_EMAIL);
                $changes[] = sprintf('Deleted the supplier %s', self::SUPPLIER_EMAIL);
            }
            foreach ([self::ASSET_ROOT, ...self::legacyAssetRoots()] as $root) {
                if ($env->folderExists($root)) {
                    $env->deleteFolder($root);
                    $changes[] = sprintf('Deleted the folder %s with the demo assets', $root);
                }
            }
            // the briefs before their class, which goes only when no object of it is left
            if ($env instanceof RideBriefs) {
                foreach ([self::ASSET_ROOT, ...self::legacyAssetRoots()] as $root) {
                    if ($env->objectFolderExists($root)) {
                        $env->deleteObjectFolder($root);
                        $changes[] = sprintf('Deleted the data object folder %s with the open briefs', $root);
                    }
                }
                if ($env->briefClassFields(self::BRIEF_CLASS) !== null) {
                    $env->deleteBriefClass(self::BRIEF_CLASS);
                    $changes[] = sprintf('Deleted the data object class "%s"', self::BRIEF_CLASS);
                }
            }
            $portalId = $env->portalId();
            // the Talk link's block goes first, so the portal's own footer is back as it was before setup
            if ($portalId !== null && $env instanceof PortalFooter) {
                $footer = $env->footer($portalId);
                if ($footer !== null && $footer['demo']) {
                    $env->removeDemoFooter($portalId);
                    $changes[] = $footer['wrapsPath'] === null
                        ? 'Removed the demo\'s portal footer with the Talk link'
                        : sprintf('Removed the Talk link from the portal footer %s', $footer['wrapsPath']);
                }
            }
            // the start page's demo bricks go too, so an editor's bricks there are all that is left of it
            if ($portalId !== null && $env instanceof StartPage) {
                $bricks = $env->startPageBricks($portalId);
                $own = array_filter($bricks, static fn (array $brick): bool => (bool) $brick['demo']);
                if ($own !== []) {
                    $env->removeStartPage($portalId);
                    $changes[] = count($own) === count($bricks)
                        ? 'Removed the demo\'s start page'
                        : sprintf('Removed the demo\'s bricks from the start page, kept %d of an editor\'s', count($bricks) - count($own));
                }
            }
            if ($portalId !== null) {
                $env->deletePortal($portalId);
                $changes[] = sprintf('Deleted the portal "%s"', self::PORTAL_NAME);
            }

            return $changes;
        }

        foreach ($env->assets(self::COASTER_FOLDER) as $filename => $content) {
            if ($filename === self::COASTER_FILENAME && $content === $this->revision1()) {
                continue;
            }
            $env->deleteAsset(self::COASTER_FOLDER, (string) $filename);
            $changes[] = sprintf('Deleted %s/%s', self::COASTER_FOLDER, $filename);
        }

        return [...$changes, ...$this->setup($domain)];
    }

    /** What a setup must have given the supplier: compared with DemoEnvironment::supplier(), saved as is. */
    public function supplier(int $portalId, int $dataPoolId, ?int $briefsPoolId = null): array
    {
        $supplier = [
            'email' => self::SUPPLIER_EMAIL,
            'firstname' => self::SUPPLIER_FIRSTNAME,
            'lastname' => self::SUPPLIER_LASTNAME,
            'password' => self::SUPPLIER_PASSWORD,
            'permissions' => [
                self::PORTAL_ACCESS . $portalId => 'allow',
                self::DATA_POOL_ACCESS . $dataPoolId => 'allow',
                self::UPLOAD_FOLDER_REVIEWING . $dataPoolId => 'allow',
            ],
            // A supplier saved with the park root (before F134) no longer matches, so setup narrows it once. The pages'
            // pictures (F160) are theirs to view only, and only when a page has any.
            'assetWorkspaces' => [self::COASTER_FOLDER => self::WORKSPACE_PERMISSIONS]
                + ($this->pageImageFiles() === [] ? [] : [self::PAGES_FOLDER => self::PAGES_PERMISSIONS]),
        ];
        // The open briefs (F293): the data pool and a view-only data object workspace on the briefs' folder.
        if ($briefsPoolId !== null) {
            $supplier['permissions'][self::DATA_POOL_ACCESS . $briefsPoolId] = 'allow';
            $supplier['objectWorkspaces'] = [self::BRIEFS_FOLDER => self::BRIEFS_PERMISSIONS];
        }

        return $supplier;
    }

    /**
     * The coasters' own area (F292): moves a Thunder Loop folder from the park root (a demo set up before F292) into the
     * ride-designs folder in place, then points the data pool at that folder where it points elsewhere, and makes
     * Thunder Loop its upload folder (the supplier's Upload button). Before the
     * supplier step, so the supplier's workspace (which follows the folder) already matches.
     *
     * @return string[] what was changed
     */
    private function rideArea(RideArea $env, int $dataPoolId): array
    {
        $changes = [];
        $demo = $this->environment;
        if (!$demo->folderExists(self::COASTER_FOLDER) && $demo->folderExists(self::LEGACY_COASTER_FOLDER)) {
            $env->moveFolder(self::LEGACY_COASTER_FOLDER, self::RIDE_DESIGNS_FOLDER);
            $changes[] = sprintf('Moved the folder %s to %s', self::LEGACY_COASTER_FOLDER, self::COASTER_FOLDER);
        }
        if ($env->dataPoolRoot($dataPoolId) !== self::RIDE_DESIGNS_FOLDER) {
            $env->setDataPoolRoot($dataPoolId, self::RIDE_DESIGNS_FOLDER);
            $changes[] = sprintf('Set the listing root of the data pool "%s" to %s', self::DATA_POOL_NAME, self::RIDE_DESIGNS_FOLDER);
        }
        // The supplier's Upload button (DR-F292-1): uploads through it land in Thunder Loop, as a dropped file does.
        if ($env->uploadFolder($dataPoolId) !== self::COASTER_FOLDER) {
            $env->setUploadFolder($dataPoolId, self::COASTER_FOLDER);
            $changes[] = sprintf('Set the upload folder of the data pool "%s" to %s', self::DATA_POOL_NAME, self::COASTER_FOLDER);
        }

        return $changes;
    }

    /**
     * Uploads a missing or changed logo file and sets the portal's logo and brand colours where they differ.
     *
     * @return string[] what was changed
     */
    private function brand(int $portalId): array
    {
        $env = $this->environment;
        $changes = [];

        $uploaded = [];
        $there = $env->assets(self::BRANDING_FOLDER);
        foreach ([self::LOGO_SVG, self::LOGO_PNG] as $file) {
            $content = $this->readDemoData('branding/' . $file);
            if (($there[$file] ?? null) === $content) {
                continue;
            }
            if (array_key_exists($file, $there)) {
                $env->deleteAsset(self::BRANDING_FOLDER, $file);
            }
            $env->createAsset(self::BRANDING_FOLDER, $file, $content);
            $uploaded[] = $file;
        }
        if ($uploaded !== []) {
            $changes[] = sprintf('Uploaded the logo files %s to %s', implode(', ', $uploaded), self::BRANDING_FOLDER);
        }

        $wanted = ['logo' => self::BRANDING_FOLDER . '/' . self::LOGO_SVG, 'brand_primary' => self::BRAND_PRIMARY, 'brand_accent' => self::BRAND_ACCENT];
        $actual = $env->portalBranding($portalId);
        // A re-uploaded SVG is a new asset, so the logo is set again even when its path is the same.
        if (in_array(self::LOGO_SVG, $uploaded, true) || array_intersect_key($actual, $wanted) != $wanted) {
            $env->setPortalBranding($portalId, $wanted['logo'], self::BRAND_PRIMARY, self::BRAND_ACCENT);
            $changes[] = sprintf('Set the logo and the brand colours %s and %s on the portal "%s"', self::BRAND_PRIMARY, self::BRAND_ACCENT, self::PORTAL_NAME);
        }

        return $changes;
    }

    /**
     * Sets the data pool's navigation icon, writes the brief and the supplier pages where their text is missing or
     * changed, and sets a missing or other navigation icon on them; only the demo's own pages are touched (ContentPages::contentPage()).
     *
     * @return string[] what was changed
     */
    private function contentPages(ContentPages $env, int $portalId, int $dataPoolId, array $pagesHtml): array
    {
        $changes = [];
        if ($env->navigationIcon($dataPoolId) !== self::DATA_POOL_ICON) {
            $env->setNavigationIcon($dataPoolId, self::DATA_POOL_ICON);
            $changes[] = sprintf('Set the navigation icon %s on the data pool "%s"', self::DATA_POOL_ICON, self::DATA_POOL_NAME);
        }
        // With the open briefs (F293) the brief page is no longer written: briefs() removes it.
        $pages = $this->hasBriefs() ? [] : [self::BRIEF_KEY => [self::BRIEF_TITLE, self::BRIEF_ICON, $pagesHtml[self::BRIEF_KEY]]];
        foreach (self::CONTENT_PAGES as $key => [$title, $icon]) {
            $pages[$key] = [$title, $icon, $pagesHtml[$key]];
        }
        foreach ($pages as $key => [$title, $icon, $html]) {
            $page = $env->contentPage($portalId, (string) $key);
            $sameText = $page !== null && $page['title'] === $title && self::sameHtml($page['html'], $html);
            if ($sameText && $page['icon'] === $icon) {
                continue;
            }
            $env->saveContentPage($portalId, (string) $key, $title, $icon, $html);
            if (!$sameText) {
                $changes[] = $key === self::BRIEF_KEY
                    ? sprintf('Wrote the brief page "%s"', $title)
                    : sprintf('Wrote the page "%s"', $title);
            } else {
                $changes[] = sprintf('Set the navigation icon %s on the page "%s"', $icon, $title);
            }
        }

        return $changes;
    }

    /**
     * The small "Talk" link in the portal footer (F157): a portal without a footer gets the demo's; one with another
     * footer keeps it and gets the link at its end, in the demo's marked footer that wraps it; the demo's own stays.
     *
     * @return string[] what was changed
     */
    private function footer(PortalFooter $env, int $portalId): array
    {
        $footer = $env->footer($portalId);
        if ($footer !== null && $footer['demo']) {
            return [];
        }
        $env->setDemoFooter($portalId, $footer['id'] ?? null);

        return [$footer === null
            ? 'Set the portal footer with the Talk link'
            : sprintf('Kept the portal footer %s and added the Talk link at its end', $footer['path'])];
    }

    /**
     * Writes the start page where the demo's bricks are missing or changed; a start page holding any brick that is not
     * the demo's stays as it is, with a line saying so.
     *
     * @return string[] what was changed
     */
    private function startPageStep(StartPage $env, int $portalId, array $wanted): array
    {
        $bricks = $env->startPageBricks($portalId);
        $others = array_values(array_filter($bricks, static fn (array $brick): bool => !$brick['demo']));
        if ($others !== []) {
            return [sprintf(
                'Left the start page of the portal "%s" as it is: it holds bricks that are not the demo\'s (%s); remove them to get the demo\'s',
                self::PORTAL_NAME,
                implode(', ', array_unique(array_map(static fn (array $brick): string => (string) $brick['type'], $others))),
            )];
        }
        if (self::sameBricks($bricks, $wanted)) {
            return [];
        }
        $env->saveStartPage($portalId, $wanted);

        return [$bricks === []
            ? sprintf('Wrote the start page of the portal "%s"', self::PORTAL_NAME)
            : sprintf('Repaired the start page of the portal "%s"', self::PORTAL_NAME)];
    }

    /**
     * The start page shows only on the Studio frontend: an empty frontend variant becomes "new"; "new" stays without a
     * write; another value is an editor's choice and stays, with a line saying the start page won't show.
     *
     * @return string[] what was changed
     */
    private function frontendVariantStep(StartPage $env, int $portalId): array
    {
        $variant = (string) ($env->frontendVariant($portalId) ?? '');
        if ($variant === self::FRONTEND_VARIANT) {
            return [];
        }
        if ($variant !== '') {
            return [sprintf(
                'Left the frontend variant of the portal "%s" at "%s": it was set by hand; the start page shows only on "%s", so set it there to see it',
                self::PORTAL_NAME,
                $variant,
                self::FRONTEND_VARIANT,
            )];
        }
        $env->setFrontendVariant($portalId, self::FRONTEND_VARIANT);

        return [sprintf('Set the frontend variant of the portal "%s" to "%s", so it shows the start page', self::PORTAL_NAME, self::FRONTEND_VARIANT)];
    }

    /** Whether setup makes the open briefs: on an environment with content pages (the brief page it replaces) and briefs. */
    private function hasBriefs(): bool
    {
        return $this->environment instanceof RideBriefs && $this->environment instanceof ContentPages;
    }

    /**
     * The open briefs (F293): the "Ride brief" class with BRIEF_FIELDS, each brief of demo-data/open-briefs.json as its
     * object where it is missing or changed (an editor's other briefs stay), the "Open briefs" data pool right after the
     * ride designs, and the old brief page out of the navigation.
     *
     * @return array{0: int, 1: string[]} the data pool's id and what was changed
     */
    private function briefs(RideBriefs&ContentPages $env, int $portalId, int $dataPoolId): array
    {
        $changes = [];
        $fields = $env->briefClassFields(self::BRIEF_CLASS);
        if ($fields !== self::BRIEF_FIELDS) {
            $env->saveBriefClass(self::BRIEF_CLASS, self::BRIEF_CLASS_TITLE, self::BRIEF_FIELDS);
            $changes[] = $fields === null
                ? sprintf('Created the data object class "%s" (%s)', self::BRIEF_CLASS, self::BRIEF_CLASS_TITLE)
                : sprintf('Updated the fields of the data object class "%s"', self::BRIEF_CLASS);
        }

        $there = $env->briefs(self::BRIEF_CLASS, self::BRIEFS_FOLDER);
        $written = [];
        foreach ($this->openBriefs() as $key => $values) {
            if (self::sameBrief($there[$key] ?? null, $values)) {
                continue;
            }
            $env->saveRideBrief(self::BRIEF_CLASS, self::BRIEFS_FOLDER, $key, $values);
            $written[] = $key;
        }
        if ($written !== []) {
            $changes[] = sprintf('Wrote the open briefs %s to %s', implode(', ', $written), self::BRIEFS_FOLDER);
        }

        $pool = $env->briefsPool($portalId, self::BRIEFS_POOL_NAME);
        $wanted = ['class' => self::BRIEF_CLASS, 'root' => self::BRIEFS_FOLDER, 'icon' => self::BRIEFS_ICON,
            'permissions' => self::BRIEFS_PERMISSIONS, 'after' => self::DATA_POOL_NAME];
        $poolId = $pool['id'] ?? null;
        if ($pool === null || array_intersect_key($pool, $wanted) != $wanted) {
            $poolId = $env->saveBriefsPool($portalId, self::BRIEFS_POOL_NAME, self::BRIEF_CLASS, self::BRIEFS_FOLDER, self::BRIEFS_ICON, self::BRIEFS_PERMISSIONS, $dataPoolId);
            $changes[] = $pool === null
                ? sprintf('Created the data pool "%s" (%s objects in %s, view only) after "%s"', self::BRIEFS_POOL_NAME, self::BRIEF_CLASS, self::BRIEFS_FOLDER, self::DATA_POOL_NAME)
                : sprintf('Repaired the data pool "%s"', self::BRIEFS_POOL_NAME);
        }

        if ($env->contentPage($portalId, self::BRIEF_KEY) !== null) {
            $env->deleteContentPage($portalId, self::BRIEF_KEY);
            $changes[] = sprintf('Removed the brief page "%s": the data pool "%s" replaces it', self::BRIEF_TITLE, self::BRIEFS_POOL_NAME);
        }

        return [(int) $poolId, $changes];
    }

    /**
     * The briefs of demo-data/open-briefs.json: [key => [field => value]], every field of BRIEF_FIELDS set, a select
     * one of its options.
     *
     * @return array<string, array<string, mixed>>
     */
    public function openBriefs(): array
    {
        $file = 'demo-data/' . self::BRIEFS_FILE;
        $data = json_decode($this->readDemoData(self::BRIEFS_FILE), true);
        if (!is_array($data) || !is_array($data['briefs'] ?? null)) {
            throw new \RuntimeException(sprintf('%s: no "briefs" list.', $file));
        }
        $briefs = [];
        foreach ($data['briefs'] as $brief) {
            $key = (string) ($brief['key'] ?? '');
            if ($key === '' || isset($briefs[$key])) {
                throw new \RuntimeException(sprintf('%s: every brief needs a key of its own.', $file));
            }
            $values = [];
            foreach (self::BRIEF_FIELDS as $name => $field) {
                $value = $brief[$name] ?? null;
                $valid = match ($field[0]) {
                    'numeric' => is_int($value) || is_float($value),
                    'select' => is_string($value) && array_key_exists($value, $field[2]),
                    default => is_string($value) && $value !== '',
                };
                if (!$valid) {
                    throw new \RuntimeException(sprintf('%s: the brief "%s" has no valid %s.', $file, $key, $name));
                }
                $values[$name] = $value;
            }
            $briefs[$key] = $values;
        }

        return $briefs;
    }

    /**
     * A brief as plain text, as the Ask the brief agent reads it (KingdomSource::briefText()): its title, one
     * "<field title>: <value>" line per field (a select's label) and its description.
     */
    public static function briefText(array $brief): string
    {
        $lines = ['Ride brief: ' . (string) ($brief['title'] ?? '')];
        foreach (self::BRIEF_FIELDS as $name => $field) {
            if ($name === 'title' || $name === 'description') {
                continue;
            }
            $value = $brief[$name] ?? null;
            if ($field[0] === 'select') {
                $value = $field[2][$value] ?? $value;
            } elseif (is_float($value) && floor($value) === $value) {
                $value = (int) $value;
            }
            $lines[] = sprintf('%s: %s', $field[1], (string) $value);
        }

        return implode("\n", $lines) . "\n\n" . trim((string) ($brief['description'] ?? ''));
    }

    /** Whether a stored brief has the wanted values (numbers compared as numbers). */
    private static function sameBrief(?array $stored, array $wanted): bool
    {
        if ($stored === null) {
            return false;
        }
        foreach ($wanted as $name => $value) {
            $actual = $stored[$name] ?? null;
            if (is_int($value) || is_float($value) ? !is_numeric($actual) || (float) $actual !== (float) $value : $actual !== $value) {
                return false;
            }
        }

        return true;
    }

    /** Whether setup writes a start page: on an environment with content pages and a start page (the tiles link the pages). */
    private function hasStartPage(): bool
    {
        return $this->environment instanceof StartPage && $this->environment instanceof ContentPages;
    }

    /**
     * The start page's bricks from demo-data/start-page.md: "# headline", the purpose line, a "## Feature: <page key>"
     * section and one "## Tile: <key>" section per main area (the brief, the data pool as "ride-designs", each content
     * page), each with one image line, "Name: value" lines and, for the feature, its text. The tiles come in navigation
     * order and carry their page's title and icon, so a tile names its page as the navigation does.
     *
     * @return list<array<string, mixed>> the bricks as StartPage::saveStartPage() takes them
     */
    public function startPage(): array
    {
        $file = 'demo-data/' . self::START_PAGE_FILE;
        $sections = $this->startPageSections($this->readDemoData(self::START_PAGE_FILE), $file);
        // The brief's tile ("## Tile: brief") opens the open briefs where setup makes them (F293), else the brief page.
        $brief = $this->hasBriefs()
            ? [self::BRIEFS_POOL_NAME, self::BRIEFS_ICON, 'data-pool:' . self::BRIEFS_POOL_NAME]
            : [self::BRIEF_TITLE, self::BRIEF_ICON, 'page:' . self::BRIEF_KEY];
        $pages = [self::BRIEF_KEY => $brief,
            self::DATA_POOL_TILE => [self::DATA_POOL_NAME, self::DATA_POOL_ICON, 'data-pool:' . self::DATA_POOL_NAME]];
        foreach (self::CONTENT_PAGES as $key => [$title, $icon]) {
            $pages[$key] = [$title, $icon, 'page:' . $key];
        }

        $feature = $sections['feature'] ?? throw new \RuntimeException(sprintf('%s: no "## Feature: <page>" section.', $file));
        $link = $pages[$feature['key']] ?? null;
        if ($link === null || !str_starts_with($link[2], 'page:')) {
            throw new \RuntimeException(sprintf('%s: the feature links to "%s", which is not a page setup makes.', $file, $feature['key']));
        }
        $tiles = [];
        foreach ($pages as $key => [$title, $icon, $target]) {
            $tile = $sections['tiles'][$key] ?? throw new \RuntimeException(sprintf('%s: no "## Tile: %s" section.', $file, $key));
            $tiles[] = ['title' => $title, 'meta' => $tile['fields']['meta'] ?? '', 'cta' => $tile['fields']['button'] ?? '',
                'icon' => $icon, 'image' => $tile['image'], 'link' => $target];
        }
        $unknown = array_diff(array_keys($sections['tiles']), array_keys($pages));
        if ($unknown !== []) {
            throw new \RuntimeException(sprintf('%s: a tile for %s, which is not a page setup makes.', $file, implode(', ', $unknown)));
        }

        return [
            ['type' => self::FEATURE_BRICK, 'variant' => self::FEATURE_VARIANT, 'eyebrow' => $feature['fields']['overline'] ?? '',
                'title' => $feature['fields']['title'] ?? '', 'description' => $feature['html'], 'image' => $feature['image'],
                'alt' => $feature['alt'], 'link' => ['page' => $link[2], 'text' => $feature['fields']['link'] ?? $link[0]]],
            ['type' => self::HERO_BRICK, 'headline' => $sections['headline'], 'intro' => $sections['intro']],
            ['type' => self::TILES_BRICK, 'size' => self::TILES_SIZE, 'tiles' => $tiles],
        ];
    }

    /**
     * @return array{headline: string, intro: string, feature: ?array, tiles: array<string, array>} each section as
     *                                                                                                   [key, image, alt, fields, html]
     */
    private function startPageSections(string $markdown, string $file): array
    {
        $result = ['headline' => '', 'intro' => '', 'feature' => null, 'tiles' => []];
        $intro = [];
        $section = null;
        $flush = function () use (&$section, &$result, $file): void {
            if ($section === null) {
                return;
            }
            if ($section['image'] === null) {
                throw new \RuntimeException(sprintf('%s: the section "%s" has no image line.', $file, $section['key']));
            }
            $paragraphs = array_filter(array_map('trim', preg_split('/\n\s*\n/', trim(implode("\n", $section['text'])))));
            $section['html'] = implode("\n", array_map(static fn (string $text): string => '<p>' . htmlspecialchars(preg_replace('/\s+/', ' ', $text), ENT_QUOTES | ENT_HTML5) . '</p>', $paragraphs));
            unset($section['text']);
            if ($section['kind'] === 'feature') {
                $result['feature'] = $section;
            } else {
                $result['tiles'][$section['key']] = $section;
            }
        };
        foreach (explode("\n", str_replace("\r\n", "\n", $markdown)) as $line) {
            if (preg_match('/^# (.+)$/', $line, $match) && $result['headline'] === '') {
                $result['headline'] = trim($match[1]);
            } elseif (preg_match('/^## (Feature|Tile): ([a-z0-9-]+)\s*$/', $line, $match)) {
                $flush();
                $section = ['kind' => strtolower($match[1]), 'key' => $match[2], 'image' => null, 'alt' => '', 'fields' => [], 'text' => []];
            } elseif ($section === null) {
                $intro[] = $line;
            } elseif (preg_match(BriefHtml::IMAGE_LINE, $line, $match)) {
                $this->pageImageContent($match[2]); // a missing file stops setup here
                $section['image'] = self::PAGES_FOLDER . '/' . $match[2];
                $section['alt'] = trim($match[1]);
            } elseif (preg_match('/^(Overline|Title|Link|Meta|Button): (.+)$/', $line, $match)) {
                $section['fields'][strtolower($match[1])] = trim($match[2]);
            } else {
                $section['text'][] = $line;
            }
        }
        $flush();
        $result['intro'] = trim(preg_replace('/\s+/', ' ', implode(' ', $intro)));
        if ($result['headline'] === '' || $result['intro'] === '') {
            throw new \RuntimeException(sprintf('%s: starts with "# <headline>" and the purpose line.', $file));
        }

        return $result;
    }

    /** Whether the start page's bricks are all the demo's and the same as $wanted (the HTML compared as by sameHtml()). */
    private static function sameBricks(array $actual, array $wanted): bool
    {
        $normal = static function (array $bricks): string {
            $bricks = array_map(static function (array $brick): array {
                unset($brick['demo']);
                if (isset($brick['description'])) {
                    $brick['description'] = trim(preg_replace('#\\s*/>#', '>', html_entity_decode((string) $brick['description'], ENT_QUOTES | ENT_HTML5, 'UTF-8')));
                }

                return $brick;
            }, array_values($bricks));
            $sort = static function (mixed $value) use (&$sort): mixed {
                if (!is_array($value)) {
                    return is_string($value) ? trim($value) : $value;
                }
                if (!array_is_list($value)) {
                    ksort($value);
                }

                return array_map($sort, $value);
            };

            return json_encode($sort($bricks));
        };

        return $normal($actual) === $normal($wanted);
    }

    public function briefHtml(): string
    {
        return $this->pagesHtml()[self::BRIEF_KEY];
    }

    /** @return array<string, string> the Markdown of the brief and the content pages: [key => Markdown] */
    private function pagesMarkdown(): array
    {
        $markdown = [self::BRIEF_KEY => $this->readDemoData('brief.md')];
        foreach (array_keys(self::CONTENT_PAGES) as $key) {
            $markdown[$key] = $this->readDemoData('pages/' . $key . '.md');
        }

        return $markdown;
    }

    /**
     * The HTML of the brief and the content pages, their images pointing at the uploaded assets.
     *
     * @return array<string, string> [key => HTML]
     */
    private function pagesHtml(): array
    {
        $html = [];
        foreach ($this->pagesMarkdown() as $key => $markdown) {
            $file = $key === self::BRIEF_KEY ? 'brief.md' : 'pages/' . $key . '.md';
            try {
                $html[$key] = BriefHtml::fromMarkdown($markdown, fn (string $image): array => $this->pageImage($image));
            } catch (\RuntimeException $e) {
                throw new \RuntimeException(sprintf('demo-data/%s: %s', $file, $e->getMessage()), 0, $e);
            }
        }

        return $html;
    }

    /**
     * The image files of the pages setup writes, each once: the brief's always, the content pages' only on an
     * environment with content pages (F161; on one without, setup writes only the brief).
     *
     * @return string[]
     */
    private function pageImageFiles(): array
    {
        $files = [];
        $pages = $this->pagesMarkdown();
        if (!$this->environment instanceof ContentPages) {
            $pages = [self::BRIEF_KEY => $pages[self::BRIEF_KEY]];
        }
        if ($this->hasStartPage()) {
            $pages[] = $this->readDemoData(self::START_PAGE_FILE);
        }
        foreach ($pages as $markdown) {
            $files = [...$files, ...BriefHtml::images($markdown)];
        }

        return array_values(array_unique($files));
    }

    /**
     * An image line's file: its URL (the uploaded asset's path, each part URL-encoded) and its size.
     *
     * @return array{src: string, width: int, height: int}
     */
    private function pageImage(string $file): array
    {
        $content = $this->pageImageContent($file);
        [$width, $height] = BriefHtml::imageSize($content);
        $src = implode('/', array_map('rawurlencode', explode('/', self::PAGES_FOLDER . '/' . $file)));

        return ['src' => $src, 'width' => $width, 'height' => $height];
    }

    private function pageImageContent(string $file): string
    {
        $path = $this->demoDataDir . '/' . self::PAGE_IMAGES_DIR . '/' . $file;
        $content = preg_match('#^[^/\\\\]+$#', $file) && $file !== '.' && $file !== '..' && is_file($path) ? @file_get_contents($path) : false;
        if ($content === false) {
            throw new \RuntimeException(sprintf('the image %s is not in demo-data/%s/.', $file, self::PAGE_IMAGES_DIR));
        }

        return $content;
    }

    /**
     * Uploads each image the pages name once into PAGES_FOLDER, replaces one whose file changed, and removes one no
     * page names any more. The pages point at the path, so a replaced image needs no change to their HTML.
     *
     * @return string[] what was changed
     */
    private function pageImages(): array
    {
        $env = $this->environment;
        $files = $this->pageImageFiles();
        $there = $files === [] && !$env->folderExists(self::PAGES_FOLDER) ? [] : $env->assets(self::PAGES_FOLDER);
        $uploaded = [];
        foreach ($files as $file) {
            $content = $this->pageImageContent($file);
            if (($there[$file] ?? null) === $content) {
                continue;
            }
            if (array_key_exists($file, $there)) {
                $env->deleteAsset(self::PAGES_FOLDER, $file);
            }
            $env->createAsset(self::PAGES_FOLDER, $file, $content);
            $uploaded[] = $file;
        }
        $changes = $uploaded === [] ? [] : [sprintf('Uploaded the page images %s to %s', implode(', ', $uploaded), self::PAGES_FOLDER)];
        foreach (array_diff(array_map('strval', array_keys($there)), $files) as $stale) {
            $env->deleteAsset(self::PAGES_FOLDER, $stale);
            $changes[] = sprintf('Deleted %s/%s, which no page names any more', self::PAGES_FOLDER, $stale);
        }

        return $changes;
    }

    public function revision1(): string
    {
        return $this->readDemoData(self::REVISION_1);
    }

    /**
     * Pimcore's wysiwyg save writes entities its own way (&apos; as &#039;, &quot; as &#34;) and drops the trailing
     * newline, and its sanitizer closes a void element as <img … /> (F160), so the stored brief counts as the same when it
     * only differs in that.
     */
    private static function sameHtml(?string $stored, string $wanted): bool
    {
        if (null === $stored) {
            return false;
        }
        $normal = static fn (string $html): string => trim(preg_replace('#\\s*/>#', '>', html_entity_decode($html, ENT_QUOTES | ENT_HTML5, 'UTF-8')));

        return $normal($stored) === $normal($wanted);
    }

    /** @return string[] the asset folders the demo used under the park's earlier names */
    private static function legacyAssetRoots(): array
    {
        return array_map(static fn (string $name) => '/' . $name, self::LEGACY_PARK_NAMES);
    }

    private function supplierMatches(?array $actual, array $wanted): bool
    {
        if ($actual === null || !($actual['passwordValid'] ?? false)) {
            return false;
        }
        foreach (['email', 'firstname', 'lastname'] as $field) {
            if (($actual[$field] ?? null) !== $wanted[$field]) {
                return false;
            }
        }
        foreach ($wanted['permissions'] as $permission => $value) {
            if (($actual['permissions'][$permission] ?? null) !== $value) {
                return false;
            }
        }
        foreach (['assetWorkspaces', 'objectWorkspaces'] as $kind) {
            if (!array_key_exists($kind, $wanted)) {
                continue;
            }
            $workspaces = $actual[$kind] ?? [];
            if (array_keys($workspaces) !== array_keys($wanted[$kind])) {
                return false;
            }
            foreach ($wanted[$kind] as $path => $permissions) {
                if (array_diff($permissions, $workspaces[$path]) !== [] || array_diff($workspaces[$path], $permissions) !== []) {
                    return false;
                }
            }
        }

        return true;
    }

    private function readDemoData(string $file): string
    {
        $content = @file_get_contents($this->demoDataDir . '/' . $file);
        if ($content === false) {
            throw new \RuntimeException(sprintf('Demo data file %s/%s is missing.', $this->demoDataDir, $file));
        }

        return $content;
    }
}
