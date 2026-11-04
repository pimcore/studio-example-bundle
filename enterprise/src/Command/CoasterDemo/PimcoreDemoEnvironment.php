<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

use Pimcore\Bundle\PortalEngineBundle\Enum\Document\ControllerReference;
use Pimcore\Bundle\PortalEngineBundle\Enum\Document\Editables\ContentConfig;
use Pimcore\Bundle\PortalEngineBundle\Enum\Document\Editables\PortalConfig;
use Pimcore\Bundle\PortalEngineBundle\Enum\Wizard;
use Pimcore\Bundle\PortalEngineBundle\Service\Wizard\WizardService;
use Pimcore\Cache;
use Pimcore\Model\Asset;
use Pimcore\Model\DataObject;
use Pimcore\Model\DataObject\Data\ElementMetadata;
use Pimcore\Model\DataObject\PortalUser;
use Pimcore\Model\Document;
use Pimcore\Model\Document\Editable;
use Pimcore\Model\Element;
use Pimcore\Model\Element\ElementInterface;
use Pimcore\Model\Site;
use Pimcore\Model\Tool\TmpStore;
use Pimcore\Model\Translation;

/**
 * The demo on Pimcore and the Portal Engine. The portal is made by the Portal Engine's own wizard (the same code the
 * Studio "Create portal" wizard runs, here in the foreground); the supplier is a PortalUser object; the coaster is an
 * asset created like an upload, so the coaster listener fills its metadata. Every element the demo creates gets the
 * property "coaster-demo", and only elements with it are found as the demo's or deleted.
 */
class PimcoreDemoEnvironment implements DemoEnvironment, ContentPages
{
    public const MARK = 'coaster-demo';

    public const USER_FOLDER = '/Portal Users/Coaster demo';

    public const USER_KEY = 'loopwerk-supplier';

    public const BRIEF_KEY = CoasterDemo::BRIEF_KEY;

    // A demo content page whose key an editor's page already had (F155) gets the next free key and keeps its own here.
    public const PAGE_KEY = 'coaster-demo-page';

    // The content areablock of a portal content page (PortalController::contentAction) and its WYSIWYG brick.
    private const AREABLOCK = 'content';

    private const BRICK = 'portal-engine-wysiwyg';

    // The columns of PortalUser.assetWorkspaceDefinition, without the "permission_" prefix.
    private const WORKSPACE_COLUMNS = ['view', 'download', 'edit', 'update', 'create', 'delete', 'subfolder', 'view_owned_assets_only'];

    public function __construct(private readonly WizardService $wizardService)
    {
    }

    public function portalId(): ?int
    {
        foreach ((new Site\Listing())->getSites() as $site) {
            $root = Document\Page::getById($site->getRootId());
            if ($root && $root->getProperty(self::MARK)) {
                return $root->getId();
            }
        }

        return null;
    }

    public function createPortal(string $name, string $domain, string $language, string $dataPoolName): int
    {
        $key = 'portal-engine_wizard_coaster_demo_' . uniqid();
        TmpStore::add($key, [Wizard::PORTAL_CONFIG => [
            ['type' => Wizard::TYPE_PORTAL, 'portalName' => $name, 'domain' => $domain, 'availableLanguages' => [$language]],
            ['type' => Wizard::TYPE_ASSET, 'dataPoolName' => $dataPoolName, 'enableFolderNavigation' => true],
        ]], Wizard::TMP_STORE_TAG, Wizard::LIFETIME);

        try {
            $this->wizardService->createPortal($key);
            $portalId = TmpStore::get($key)?->getData()[Wizard::PORT_DOCUMENT_ID] ?? null;
        } finally {
            TmpStore::delete($key);
        }

        $portal = $portalId ? Document\Page::getById($portalId, ['force' => true]) : null;
        if (!$portal) {
            throw new \RuntimeException(sprintf('The Portal Engine wizard could not create the portal "%s" (see the application log).', $name));
        }
        $portal->setProperty(self::MARK, 'bool', true, false, false);
        $portal->save();

        return $portal->getId();
    }

    public function dataPoolId(int $portalId, string $dataPoolName): ?int
    {
        return $this->dataPool($portalId, $dataPoolName)?->getId();
    }

    public function portalName(int $portalId): ?string
    {
        $data = Document\Page::getById($portalId, ['force' => true])?->getEditable(PortalConfig::PORTAL_NAME)?->getData();

        return $data === null ? null : (string) $data;
    }

    /** As the wizard names it: the "Portal name" input and a valid, unique document key; the cache holds the config. */
    public function renamePortal(int $portalId, string $name): void
    {
        $portal = Document\Page::getById($portalId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal (document %d) is gone.', $portalId));
        $portal->getEditables(); // keeps the other settings, as in enablePlugin()
        $portal->setRawEditable(PortalConfig::PORTAL_NAME, 'input', $name);
        $portal->setKey(Element\Service::getValidKey($name, 'document'));
        $portal->setKey(Element\Service::getUniqueKey($portal));
        $portal->save();
        Cache::clearAll();
    }

    public function deletePortal(int $portalId): void
    {
        Site::getByRootId($portalId)?->delete();
        Document::getById($portalId)?->delete();
    }

    public function enabledPlugins(int $portalId): array
    {
        $portal = Document\Page::getById($portalId, ['force' => true]);
        $data = $portal?->getEditable(PortalConfig::ENABLED_PLUGINS)?->getData();

        return array_values(array_filter((array) ($data ?? [])));
    }

    /** As Studio's "Enabled plugins" multiselect saves it; the cache holds the portal's config, so it is cleared. */
    public function enablePlugin(int $portalId, string $pluginId): void
    {
        $portal = Document\Page::getById($portalId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal (document %d) is gone.', $portalId));
        $enabled = $this->enabledPlugins($portalId);
        if (!in_array($pluginId, $enabled, true)) {
            $enabled[] = $pluginId;
        }
        // Loaded first: save() deletes the page's editables and writes back only the loaded ones, so without this the
        // portal would lose its name, logo and the rest of its settings.
        $portal->getEditables();
        $portal->setRawEditable(PortalConfig::ENABLED_PLUGINS, 'multiselect', $enabled);
        // A failed save throws, so setup stops and the command exits non-zero.
        $portal->save();
        Cache::clearAll();
    }

    public function briefHtml(int $portalId): ?string
    {
        return $this->contentPage($portalId, self::BRIEF_KEY)['html'] ?? null;
    }

    public function saveBrief(int $portalId, string $title, string $html): void
    {
        $this->saveContentPage($portalId, self::BRIEF_KEY, $title, CoasterDemo::BRIEF_ICON, $html);
    }

    public function contentPage(int $portalId, string $key): ?array
    {
        $page = $this->demoPage($portalId, $key);
        if (!$page) {
            return null;
        }
        $icon = $page->getEditable(ContentConfig::NAVIGATION_ICON)?->getData();
        $html = $page->getEditable(self::wysiwygName())?->getData();

        return ['title' => (string) $page->getTitle(), 'icon' => is_string($icon) ? $icon : '', 'html' => $html === null ? null : (string) $html];
    }

    public function saveContentPage(int $portalId, string $key, string $title, string $icon, string $html): void
    {
        $page = $this->demoPage($portalId, $key);
        if (!$page) {
            $languageRoot = $this->languageRoot($portalId)
                ?? throw new \RuntimeException(sprintf('The demo portal has no page for "%s" to go under.', $title));
            $page = new Document\Page();
            $page->setKey($key);
            $page->setParent($languageRoot);
            // An editor's page under this key stays theirs: the demo's takes the next free key and remembers its own.
            $free = Document\Service::getUniqueKey($page);
            if ($free !== $key) {
                $page->setKey($free);
                $page->setProperty(self::PAGE_KEY, 'text', $key, false, false);
            }
            $page->setController(ControllerReference::PORTAL_CONTENT_PAGE);
            $page->setPublished(true);
            $page->setProperty(self::MARK, 'bool', true, false, false);
        } else {
            // PageSnippet::save() writes back only the loaded editables: load them, so the page keeps its others.
            $page->getEditables();
        }
        $page->setTitle($title);
        $page->setProperty('navigation_name', 'text', $title);
        $page->setRawEditable(ContentConfig::NAVIGATION_ICON, 'select', $icon);
        $page->setRawEditable(self::AREABLOCK, 'areablock', [['key' => '1', 'type' => self::BRICK, 'hidden' => false]]);
        $page->setRawEditable(self::wysiwygName(), 'wysiwyg', $html);
        $page->save();
    }

    public function navigationIcon(int $documentId): string
    {
        $icon = Document\Page::getById($documentId, ['force' => true])?->getEditable(ContentConfig::NAVIGATION_ICON)?->getData();

        return is_string($icon) ? $icon : '';
    }

    public function setNavigationIcon(int $documentId, string $icon): void
    {
        $page = Document\Page::getById($documentId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal has no page %d for the navigation icon.', $documentId));
        $page->getEditables(); // keeps the other settings, as in enablePlugin()
        $page->setRawEditable(ContentConfig::NAVIGATION_ICON, 'select', $icon);
        $page->save();
    }

    public function portalBranding(int $portalId): array
    {
        $portal = Document\Page::getById($portalId, ['force' => true]);
        $logo = $portal?->getEditable(PortalConfig::LOGO);
        $text = static function (?Editable $editable): ?string {
            $data = $editable?->getData();

            return $data === null || $data === '' ? null : (string) $data;
        };

        return [
            'logo' => $logo instanceof Editable\Image ? $logo->getImage()?->getRealFullPath() : null,
            'brand_primary' => $text($portal?->getEditable(PortalConfig::BRAND_PRIMARY)),
            'brand_accent' => $text($portal?->getEditable(PortalConfig::BRAND_ACCENT)),
        ];
    }

    /** As the portal settings (Style Settings) save them; the cache holds the portal's config, so it is cleared. */
    public function setPortalBranding(int $portalId, string $logo, string $brandPrimary, string $brandAccent): void
    {
        $portal = Document\Page::getById($portalId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal (document %d) is gone.', $portalId));
        $image = Asset::getByPath($logo);
        if (!$image instanceof Asset\Image) {
            throw new \RuntimeException(sprintf('The logo %s is not an image asset.', $logo));
        }
        $portal->getEditables(); // keeps the other settings, as in enablePlugin()
        $portal->setRawEditable(PortalConfig::LOGO, 'image', ['id' => $image->getId()]);
        $portal->setRawEditable(PortalConfig::BRAND_PRIMARY, 'input', $brandPrimary);
        $portal->setRawEditable(PortalConfig::BRAND_ACCENT, 'input', $brandAccent);
        $portal->save();
        Cache::clearAll();
    }

    public function supplier(string $email, string $password): ?array
    {
        $user = $this->portalUser($email);
        if (!$user) {
            return null;
        }

        $workspaces = [];
        foreach ((array) $user->getAssetWorkspaceDefinition() as $workspace) {
            $element = $workspace->getElement();
            if ($element instanceof ElementInterface) {
                $data = $workspace->getData();
                $workspaces[$element->getRealFullPath()] = array_values(array_filter(
                    self::WORKSPACE_COLUMNS,
                    static fn (string $column) => (bool) ($data['permission_' . $column] ?? false),
                ));
            }
        }
        $passwordField = $user->getClass()->getFieldDefinition('portalPassword');

        return [
            'email' => $user->getEmail(),
            'firstname' => $user->getFirstname(),
            'lastname' => $user->getLastname(),
            'passwordValid' => !$user->getUsePimcoreUserPassword()
                && $passwordField instanceof DataObject\ClassDefinition\Data\Password
                && $passwordField->verifyPassword($password, $user, false),
            'permissions' => (array) $user->getPermission(),
            'assetWorkspaces' => $workspaces,
        ];
    }

    public function saveSupplier(array $supplier): void
    {
        $user = $this->portalUser($supplier['email']);
        if (!$user) {
            $user = new PortalUser();
            $user->setParent(DataObject\Service::createFolderByPath(self::USER_FOLDER));
            $user->setKey(self::USER_KEY);
            $user->setPublished(true);
            $user->setProperty(self::MARK, 'bool', true, false, false);
        }
        $user->setEmail($supplier['email']);
        $user->setFirstname($supplier['firstname']);
        $user->setLastname($supplier['lastname']);
        $user->setPreferredLanguage(CoasterDemo::LANGUAGE);
        $user->setUsePimcoreUserPassword(false);
        $user->setPortalPassword($supplier['password']);
        $user->setPermission([...(array) $user->getPermission(), ...$supplier['permissions']]);

        $workspaces = [];
        foreach ($supplier['assetWorkspaces'] as $path => $permissions) {
            $folder = $this->markedFolder($path);
            $workspace = new ElementMetadata('assetWorkspaceDefinition', array_map(static fn (string $column) => 'permission_' . $column, self::WORKSPACE_COLUMNS), $folder);
            $workspace->setData(array_combine(
                array_map(static fn (string $column) => 'permission_' . $column, self::WORKSPACE_COLUMNS),
                array_map(static fn (string $column) => in_array($column, $permissions, true), self::WORKSPACE_COLUMNS),
            ));
            $workspaces[] = $workspace;
        }
        $user->setAssetWorkspaceDefinition($workspaces);
        $user->save();
    }

    public function deleteSupplier(string $email): void
    {
        $user = $this->portalUser($email);
        if ($user && $user->getProperty(self::MARK)) {
            $user->delete();
        }
    }

    public function assets(string $folder): array
    {
        $parent = Asset::getByPath($folder);
        if (!$parent instanceof Asset\Folder) {
            return [];
        }

        $assets = [];
        foreach ($parent->getChildren() as $child) {
            if ($child instanceof Asset && !$child instanceof Asset\Folder) {
                $assets[$child->getFilename()] = (string) $child->getData();
            }
        }

        return $assets;
    }

    public function createAsset(string $folder, string $filename, string $content): void
    {
        $parent = $this->markedFolder($folder);

        $asset = Asset::create($parent->getId(), ['filename' => $filename, 'data' => $content], false);
        $asset->setProperty(self::MARK, 'bool', true, false, false);
        $asset->save();
    }

    public function deleteAsset(string $folder, string $filename): void
    {
        Asset::getByPath($folder . '/' . $filename)?->delete();
    }

    public function assetMetadata(string $folder, string $filename): array
    {
        $asset = Asset::getByPath($folder . '/' . $filename);
        if (!$asset) {
            return [];
        }

        $metadata = [];
        foreach ($asset->getMetadata() as $entry) {
            $metadata[$entry['name']] = $entry['data'];
        }

        return $metadata;
    }

    public function folderExists(string $folder): bool
    {
        $asset = Asset::getByPath($folder);

        return $asset instanceof Asset\Folder && ($asset->getProperty(self::MARK) || [] !== self::ownedChildren($asset));
    }

    public function renameFolder(string $folder, string $name): void
    {
        $asset = Asset::getByPath($folder);
        if (!$asset instanceof Asset\Folder) {
            throw new \RuntimeException(sprintf('The asset folder %s is gone.', $folder));
        }
        // The same element under a new name: workspaces reference it by id, and Pimcore moves the children's paths.
        $asset->setFilename($name);
        $asset->save();
    }

    public function deleteFolder(string $folder): void
    {
        $asset = Asset::getByPath($folder);
        if (!$asset instanceof Asset\Folder) {
            return;
        }
        if ($asset->getProperty(self::MARK)) {
            $asset->delete();

            return;
        }
        // A park folder an earlier setup made unmarked: its demo children go, the folder only when nothing else is left.
        foreach (self::ownedChildren($asset) as $child) {
            $child->delete();
        }
        $asset = Asset::getById($asset->getId(), ['force' => true]);
        if ($asset instanceof Asset\Folder && !$asset->hasChildren()) {
            $asset->delete();
        }
    }

    /**
     * The asset folder at $folder, made with every missing folder on the way marked, so a full reset may delete them;
     * folders that were there stay unmarked. Setup makes folders only here (the supplier's workspace made the park
     * folder unmarked before, F99).
     */
    public function translation(string $domain, string $key, string $language): ?string
    {
        return Translation::getByKey($key, $domain)?->getTranslation($language);
    }

    // Translation::save() clears the translator cache, so the portal reads the new text on its next request.
    public function saveTranslation(string $domain, string $key, string $language, string $text): void
    {
        $translation = Translation::getByKey($key, $domain);
        if ($translation === null) {
            $translation = new Translation();
            $translation->setDomain($domain);
            $translation->setKey($key);
            $translation->setCreationDate(time());
        }
        $translation->addTranslation($language, $text);
        $translation->setModificationDate(time());
        $translation->save();
    }

    private function markedFolder(string $folder): Asset\Folder
    {
        $missing = [];
        $path = '';
        foreach (explode('/', trim($folder, '/')) as $segment) {
            $path .= '/' . $segment;
            if (!Asset::getByPath($path)) {
                $missing[] = $path;
            }
        }
        $made = Asset\Service::createFolderByPath($folder);
        foreach ($missing as $created) {
            $created = Asset::getByPath($created);
            $created?->setProperty(self::MARK, 'bool', true, false, false);
            $created?->save();
        }

        return $made;
    }

    /** @return list<Asset> the marked children of $folder (the demo's, e.g. Thunder Loop) */
    private static function ownedChildren(Asset\Folder $folder): array
    {
        return array_values(array_filter($folder->getChildren()->load(), static fn (Asset $child): bool => (bool) $child->getProperty(self::MARK)));
    }

    private static function wysiwygName(): string
    {
        return Editable::buildChildEditableName('wysiwyg', 'wysiwyg', [self::AREABLOCK], 1);
    }

    private function portalUser(string $email): ?PortalUser
    {
        $list = new PortalUser\Listing();
        $list->setUnpublished(true);
        $list->setCondition('email = ?', [$email]);
        $list->setLimit(1);
        $user = $list->current();

        return $user instanceof PortalUser ? $user : null;
    }

    /** The asset data pool page the wizard made: in the portal's language root (or the portal page itself). */
    private function dataPool(int $portalId, string $dataPoolName): ?Document\Page
    {
        $portal = Document\Page::getById($portalId);
        if (!$portal) {
            return null;
        }
        foreach ([$portal, ...iterator_to_array($portal->getChildren(), false)] as $parent) {
            foreach ($parent->getChildren() as $child) {
                if ($child instanceof Document\Page
                    && $child->getController() === ControllerReference::DATA_POOL_ASSETS_LIST
                    && $child->getTitle() === $dataPoolName) {
                    return $child;
                }
            }
        }

        return null;
    }

    private function languageRoot(int $portalId): ?Document
    {
        $dataPool = $this->dataPool($portalId, CoasterDemo::DATA_POOL_NAME);

        return $dataPool?->getParent();
    }

    /** The demo's own content page for $key in the portal's language root: marked, under $key or remembering it. */
    private function demoPage(int $portalId, string $key): ?Document\Page
    {
        $languageRoot = $this->languageRoot($portalId);
        if (!$languageRoot) {
            return null;
        }
        foreach ($languageRoot->getChildren(true) as $child) {
            if (!$child instanceof Document\Page || !$child->getProperty(self::MARK)) {
                continue;
            }
            $own = $child->getProperty(self::PAGE_KEY);
            if ($own === $key || (($own === null || $own === '') && $child->getKey() === $key)) {
                return $child;
            }
        }

        return null;
    }
}
