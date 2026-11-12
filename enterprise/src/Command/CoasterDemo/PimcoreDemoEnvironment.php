<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

use Pimcore\Bundle\PortalEngineBundle\Enum\Document\ControllerReference;
use Pimcore\Bundle\PortalEngineBundle\Enum\Document\Editables\DataPool\AssetConfig;
use Pimcore\Bundle\PortalEngineBundle\Enum\Document\Editables\DataPool\DataObjectConfig;
use Pimcore\Bundle\PortalEngineBundle\Enum\Document\Editables\DataPool\DataPoolConfig;
use Pimcore\Bundle\PortalEngineBundle\Enum\Document\Editables\DataPool\WorkspaceConfig;
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
class PimcoreDemoEnvironment implements DemoEnvironment, ContentPages, RetiredFooter, StartPage, RideArea, RideBriefs
{
    public const MARK = 'coaster-demo';

    public const USER_FOLDER = '/Portal Users/Coaster demo';

    public const USER_KEY = 'loopwerk-supplier';

    public const BRIEF_KEY = CoasterDemo::BRIEF_KEY;

    // A demo content page whose key an editor's page already had (F155) gets the next free key and keeps its own here.
    public const PAGE_KEY = 'coaster-demo-page';

    // The property of the footer snippet earlier versions of the demo wrote, naming the portal footer it showed first
    // (RetiredFooter: setup gives the portal that footer back).
    public const FOOTER_WRAPS = 'coaster-demo-footer-wraps';

    // The start page (F208): the keys of the portal root's content bricks the demo wrote, comma-separated. A brick with
    // another key is an editor's.
    public const START_BRICKS = 'coaster-demo-start-bricks';

    // The content areablock of a portal content page (PortalController::contentAction) and its WYSIWYG brick.
    private const AREABLOCK = 'content';

    private const BRICK = 'portal-engine-wysiwyg';

    // The "Ride brief" class (F293): its id, and the id of its custom layout the briefs' data pool shows on the detail page.
    public const BRIEF_CLASS_ID = 'ridebrief';

    public const BRIEF_LAYOUT_ID = 'ridebrief_portal';

    // Pimcore's field types for RideBriefs' plain type names.
    private const BRIEF_FIELD_TYPES = [
        'input' => DataObject\ClassDefinition\Data\Input::class,
        'numeric' => DataObject\ClassDefinition\Data\Numeric::class,
        'select' => DataObject\ClassDefinition\Data\Select::class,
        'textarea' => DataObject\ClassDefinition\Data\Textarea::class,
    ];

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
        $page = $this->dataPool($portalId, $dataPoolName);

        return $page?->getController() === ControllerReference::DATA_POOL_ASSETS_LIST ? $page->getId() : null;
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
        $objectWorkspaces = [];
        foreach ((array) $user->getDataObjectWorkspaceDefinition() as $workspace) {
            $element = $workspace->getElement();
            if ($element instanceof ElementInterface) {
                $objectWorkspaces[$element->getRealFullPath()] = array_values(array_map(
                    static fn (string $column) => substr($column, strlen('permission_')),
                    array_keys(array_filter((array) $workspace->getData(), static fn (mixed $on, string $column) => $on && str_starts_with($column, 'permission_'), ARRAY_FILTER_USE_BOTH)),
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
            'objectWorkspaces' => $objectWorkspaces,
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
        // The open briefs (F293): a data object workspace per folder, its columns as the PortalUser class defines them.
        if (array_key_exists('objectWorkspaces', $supplier)) {
            $field = $user->getClass()->getFieldDefinition('dataObjectWorkspaceDefinition');
            $columns = $field instanceof DataObject\ClassDefinition\Data\AdvancedManyToManyRelation ? $field->getColumnKeys() : ['permission_view'];
            $objectWorkspaces = [];
            foreach ($supplier['objectWorkspaces'] as $path => $permissions) {
                $folder = $this->markedObjectFolder($path);
                $workspace = new ElementMetadata('dataObjectWorkspaceDefinition', $columns, $folder);
                $workspace->setData(array_combine($columns, array_map(
                    static fn (string $column) => in_array(substr($column, strlen('permission_')), $permissions, true),
                    $columns,
                )));
                $objectWorkspaces[] = $workspace;
            }
            $user->setDataObjectWorkspaceDefinition($objectWorkspaces);
        }
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

    public function moveFolder(string $folder, string $parent): void
    {
        $asset = Asset::getByPath($folder);
        if (!$asset instanceof Asset\Folder) {
            throw new \RuntimeException(sprintf('The asset folder %s is gone.', $folder));
        }
        // The same element under a new parent: workspaces reference it by id, and Pimcore moves the children's paths.
        $asset->setParentId($this->markedFolder($parent)->getId());
        $asset->save();
    }

    /** The data pool's first workspace row, as the wizard writes it (WizardService::addWorkspaceBlock()). */
    private static function workspacePathName(): string
    {
        return Editable::buildChildEditableName(WorkspaceConfig::WORKSPACE_PATH, 'relation', [DataPoolConfig::WORKSPACE_DEFINITION], 1);
    }

    public function dataPoolRoot(int $dataPoolId): ?string
    {
        $editable = Document\Page::getById($dataPoolId, ['force' => true])?->getEditable(self::workspacePathName());
        $element = $editable instanceof Editable\Relation ? $editable->getElement() : null;

        return $element instanceof Asset ? $element->getRealFullPath() : null;
    }

    /** As the data pool's settings save it: the first row's relation; its permission checkboxes stay as they are. */
    public function setDataPoolRoot(int $dataPoolId, string $folder): void
    {
        $page = Document\Page::getById($dataPoolId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal has no data pool %d.', $dataPoolId));
        $target = $this->markedFolder($folder);
        $page->getEditables(); // keeps the other settings, as in enablePlugin()
        $block = $page->getEditable(DataPoolConfig::WORKSPACE_DEFINITION)?->getData();
        $rows = is_array($block) && $block !== [] ? array_values($block) : [];
        if (!in_array(1, array_map('intval', $rows), true)) {
            $rows = [1, ...$rows];
        }
        $page->setRawEditable(DataPoolConfig::WORKSPACE_DEFINITION, 'block', $rows);
        $relation = new Editable\Relation();
        $relation->setDataFromEditmode(['id' => $target->getId(), 'type' => 'asset', 'subtype' => 'folder']);
        $relation->setParentBlockNames([DataPoolConfig::WORKSPACE_DEFINITION]);
        $relation->setName(self::workspacePathName());
        $page->setEditable($relation);
        $page->save();
        Cache::clearAll();
    }

    public function uploadFolder(int $dataPoolId): ?string
    {
        $editable = Document\Page::getById($dataPoolId, ['force' => true])?->getEditable(AssetConfig::UPLOAD_FOLDER);
        $element = $editable instanceof Editable\Relation ? $editable->getElement() : null;

        return $element instanceof Asset ? $element->getRealFullPath() : null;
    }

    /** As the data pool's settings save it: the top-level "upload_folder" relation (asset folders only). */
    public function setUploadFolder(int $dataPoolId, string $folder): void
    {
        $page = Document\Page::getById($dataPoolId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal has no data pool %d.', $dataPoolId));
        $target = $this->markedFolder($folder);
        $page->getEditables(); // keeps the other settings, as in enablePlugin()
        $relation = new Editable\Relation();
        $relation->setDataFromEditmode(['id' => $target->getId(), 'type' => 'asset', 'subtype' => 'folder']);
        $relation->setName(AssetConfig::UPLOAD_FOLDER);
        $page->setEditable($relation);
        $page->save();
        Cache::clearAll();
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
    public function briefClassFields(string $className): ?array
    {
        $class = DataObject\ClassDefinition::getByName($className);
        if (!$class) {
            return null;
        }
        $types = array_flip(self::BRIEF_FIELD_TYPES);
        $fields = [];
        foreach ($class->getFieldDefinitions() as $name => $definition) {
            $type = $types[$definition::class] ?? $definition->getFieldtype();
            $field = [$type, (string) $definition->getTitle()];
            if ($definition instanceof DataObject\ClassDefinition\Data\Select) {
                $options = [];
                foreach ((array) $definition->getOptions() as $option) {
                    $options[(string) $option['value']] = (string) $option['key'];
                }
                $field[] = $options;
            }
            $fields[$name] = $field;
        }

        return $fields;
    }

    /** One panel with the fields, as the class editor saves it; the portal's custom layout repeats it (DetailHandler). */
    public function saveBriefClass(string $className, string $title, array $fields): void
    {
        $class = DataObject\ClassDefinition::getByName($className);
        if (!$class) {
            $class = new DataObject\ClassDefinition();
            $class->setId(self::BRIEF_CLASS_ID);
            $class->setName($className);
        }
        $class->setTitle($title);
        $class->setGroup('Coaster demo');
        $class->setLayoutDefinitions($this->briefLayout($title, $fields));
        $class->save();

        $layout = DataObject\ClassDefinition\CustomLayout::getById(self::BRIEF_LAYOUT_ID)
            ?? DataObject\ClassDefinition\CustomLayout::create(['id' => self::BRIEF_LAYOUT_ID, 'name' => 'Portal detail', 'classId' => $class->getId()]);
        $layout->setDescription('The detail page of the portal\'s "' . CoasterDemo::BRIEFS_POOL_NAME . '" data pool (coaster demo).');
        $layout->setLayoutDefinitions($this->briefLayout($title, $fields));
        $layout->save();
    }

    public function deleteBriefClass(string $className): void
    {
        $class = DataObject\ClassDefinition::getByName($className);
        if (!$class) {
            return;
        }
        $objects = new DataObject\Listing();
        $objects->setUnpublished(true);
        $objects->setCondition('`className` = ?', [$className]);
        if ($objects->getTotalCount() > 0) {
            return;
        }
        DataObject\ClassDefinition\CustomLayout::getById(self::BRIEF_LAYOUT_ID)?->delete();
        $class->delete();
    }

    public function briefs(string $className, string $folder): array
    {
        $parent = DataObject::getByPath($folder);
        if (!$parent instanceof DataObject\Folder) {
            return [];
        }
        $briefs = [];
        foreach ($parent->getChildren([DataObject::OBJECT_TYPE_OBJECT], true) as $child) {
            if ($child instanceof DataObject\Concrete && $child->getClassName() === $className) {
                $values = [];
                foreach (array_keys(CoasterDemo::BRIEF_FIELDS) as $name) {
                    $values[$name] = $child->get($name);
                }
                $briefs[(string) $child->getKey()] = $values;
            }
        }

        return $briefs;
    }

    public function saveRideBrief(string $className, string $folder, string $key, array $values): void
    {
        $parent = $this->markedObjectFolder($folder);
        $object = DataObject::getByPath($folder . '/' . $key, ['force' => true]);
        if (!$object instanceof DataObject\Concrete) {
            $class = '\\Pimcore\\Model\\DataObject\\' . $className;
            /** @var DataObject\Concrete $object */
            $object = new $class();
            $object->setParent($parent);
            $object->setKey($key);
            $object->setProperty(self::MARK, 'bool', true, false, false);
        }
        $class = $object->getClass();
        foreach ($values as $name => $value) {
            $object->set($name, self::setterValue($class->getFieldDefinition($name), $value));
        }
        $object->setPublished(true);
        $object->save();
    }

    /**
     * A number of the brief data in the type the generated setter of its field takes (F299): a numeric field with a
     * decimal precision (as briefLayout() creates it) takes ?string, an integer one ?int, any other ?float.
     */
    private static function setterValue(?DataObject\ClassDefinition\Data $field, mixed $value): mixed
    {
        if (!$field instanceof DataObject\ClassDefinition\Data\Numeric || !(is_int($value) || is_float($value))) {
            return $value;
        }
        $type = (string) $field->getParameterTypeDeclaration();

        return match (true) {
            str_contains($type, 'string') => (string) $value,
            str_contains($type, 'int') => (int) $value,
            default => (float) $value,
        };
    }

    public function objectFolderExists(string $folder): bool
    {
        $object = DataObject::getByPath($folder);

        return $object instanceof DataObject\Folder && ($object->getProperty(self::MARK) || [] !== self::ownedObjects($object));
    }

    public function deleteObjectFolder(string $folder): void
    {
        $object = DataObject::getByPath($folder);
        if (!$object instanceof DataObject\Folder) {
            return;
        }
        if ($object->getProperty(self::MARK)) {
            $object->delete();

            return;
        }
        foreach (self::ownedObjects($object) as $child) {
            $child->delete();
        }
    }

    public function briefsPool(int $portalId, string $name): ?array
    {
        $page = $this->dataPool($portalId, $name);
        if (!$page || $page->getController() !== ControllerReference::DATA_POOL_DATA_OBJECTS_LIST) {
            return null;
        }
        $relation = $page->getEditable(self::workspacePathName());
        $root = $relation instanceof Editable\Relation ? $relation->getElement() : null;
        $permissions = [];
        foreach (self::WORKSPACE_COLUMNS as $column) {
            $checkboxName = $column === 'view_owned_assets_only' ? WorkspaceConfig::PERMISSION_VIEW_OWNED_ASSETS_ONLY : 'permission_' . $column;
            $checkbox = $page->getEditable(Editable::buildChildEditableName($checkboxName, 'checkbox', [DataPoolConfig::WORKSPACE_DEFINITION], 1));
            if ($checkbox instanceof Editable\Checkbox && $checkbox->isChecked()) {
                $permissions[] = $column;
            }
        }
        $icon = $page->getEditable(ContentConfig::NAVIGATION_ICON)?->getData();
        $classId = (string) $page->getEditable(DataObjectConfig::DATA_OBJECT_CLASS)?->getData();
        $before = null;
        foreach ($page->getParent()?->getChildren(true) ?? [] as $sibling) {
            if ($sibling->getId() === $page->getId()) {
                break;
            }
            $before = $sibling;
        }

        return [
            'id' => $page->getId(),
            'class' => $classId === '' ? null : DataObject\ClassDefinition::getById($classId)?->getName(),
            'root' => $root instanceof DataObject\AbstractObject ? $root->getRealFullPath() : null,
            'icon' => is_string($icon) ? $icon : '',
            'permissions' => $permissions,
            'after' => $before === null ? null : (string) ($before->getProperty('navigation_name') ?: $before->getTitle()),
            'detailLayout' => $page->getEditable(DataObjectConfig::DETAIL_PAGE_LAYOUT)?->getData(),
        ];
    }

    /** As the wizard writes a data-object data pool (WizardService::createObjectDataPool()), with the demo's settings. */
    public function saveBriefsPool(int $portalId, string $name, string $className, string $folder, string $icon, array $permissions, int $afterDataPoolId): int
    {
        $after = Document\Page::getById($afterDataPoolId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal has no data pool %d to put "%s" after.', $afterDataPoolId, $name));
        $page = $this->dataPool($portalId, $name);
        if ($page && $page->getController() !== ControllerReference::DATA_POOL_DATA_OBJECTS_LIST) {
            throw new \RuntimeException(sprintf('The demo portal has a page "%s" that is no data-object data pool; rename or remove it, then run setup again.', $name));
        }
        if (!$page) {
            $page = new Document\Page();
            $page->setController(ControllerReference::DATA_POOL_DATA_OBJECTS_LIST);
            $page->setKey(Element\Service::getValidKey($name, 'document'));
            $page->setParent($after->getParent());
            $page->setKey(Document\Service::getUniqueKey($page));
            $page->setProperty(self::MARK, 'bool', true, false, false);
            $page->setProperty('language', 'select', CoasterDemo::LANGUAGE, false, true);
            $page->setRawEditable(DataPoolConfig::ENABLE_FOLDER_NAVIGATION, 'checkbox', false);
            $page->setRawEditable(DataPoolConfig::ENABLE_TAG_NAVIGATION, 'checkbox', false);
        } else {
            $page->getEditables(); // keeps the other settings, as in enablePlugin()
        }
        $page->setPublished(true);
        $page->setTitle($name);
        $page->setProperty('navigation_name', 'text', $name);
        $page->setRawEditable(ContentConfig::NAVIGATION_ICON, 'select', $icon);
        // The pool names its class by id (the class definition select's store).
        $classId = DataObject\ClassDefinition::getByName($className)?->getId()
            ?? throw new \RuntimeException(sprintf('There is no data object class "%s" for the data pool "%s".', $className, $name));
        $page->setRawEditable(DataObjectConfig::DATA_OBJECT_CLASS, 'select', $classId);
        $page->setRawEditable(DataObjectConfig::DETAIL_PAGE_LAYOUT, 'select', self::BRIEF_LAYOUT_ID);
        $page->setRawEditable(DataPoolConfig::WORKSPACE_DEFINITION, 'block', [1]);
        $relation = new Editable\Relation();
        $relation->setDataFromEditmode(['id' => $this->markedObjectFolder($folder)->getId(), 'type' => 'object', 'subtype' => 'folder']);
        $relation->setParentBlockNames([DataPoolConfig::WORKSPACE_DEFINITION]);
        $relation->setName(self::workspacePathName());
        $page->setEditable($relation);
        foreach (self::WORKSPACE_COLUMNS as $column) {
            $checkboxName = $column === 'view_owned_assets_only' ? WorkspaceConfig::PERMISSION_VIEW_OWNED_ASSETS_ONLY : 'permission_' . $column;
            $checkbox = new Editable\Checkbox();
            $checkbox->setDataFromEditmode(in_array($column, $permissions, true));
            $checkbox->setParentBlockNames([DataPoolConfig::WORKSPACE_DEFINITION]);
            $checkbox->setName(Editable::buildChildEditableName($checkboxName, 'checkbox', [DataPoolConfig::WORKSPACE_DEFINITION], 1));
            $page->setEditable($checkbox);
        }
        $page->save();

        // Right after the ride designs in the navigation (the rail lists the language root's pages by their index).
        $siblings = array_values(array_filter(
            iterator_to_array($after->getParent()->getChildren(true), false),
            static fn (Document $sibling): bool => $sibling->getId() !== $page->getId(),
        ));
        $order = [];
        foreach ($siblings as $sibling) {
            $order[] = $sibling;
            if ($sibling->getId() === $after->getId()) {
                $order[] = $page;
            }
        }
        foreach ($order as $index => $document) {
            if ($document->getIndex() !== $index) {
                $document->saveIndex($index);
            }
        }
        Cache::clearAll();

        return $page->getId();
    }

    public function deleteContentPage(int $portalId, string $key): void
    {
        $this->demoPage($portalId, $key)?->delete();
        Cache::clearAll();
    }

    /** The class's one panel with $fields, built as the class editor saves it. */
    private function briefLayout(string $title, array $fields): DataObject\ClassDefinition\Layout\Panel
    {
        $panel = new DataObject\ClassDefinition\Layout\Panel();
        $panel->setName('Brief');
        $panel->setTitle($title);
        foreach ($fields as $name => $field) {
            $class = self::BRIEF_FIELD_TYPES[$field[0]] ?? throw new \RuntimeException(sprintf('No Pimcore field type for "%s".', $field[0]));
            $definition = new $class();
            $definition->setName($name);
            $definition->setTitle($field[1]);
            if ($definition instanceof DataObject\ClassDefinition\Data\Select) {
                $definition->setOptions(array_map(static fn (string $value, string $label) => ['key' => $label, 'value' => $value], array_keys($field[2]), $field[2]));
            }
            if ($definition instanceof DataObject\ClassDefinition\Data\Numeric) {
                $definition->setDecimalPrecision(1);
            }
            $panel->addChild($definition);
        }
        $root = new DataObject\ClassDefinition\Layout\Panel();
        $root->setName('pimcore_root');
        $root->addChild($panel);

        return $root;
    }

    /** As markedFolder(), in the data object tree. */
    private function markedObjectFolder(string $folder): DataObject\Folder
    {
        $missing = [];
        $path = '';
        foreach (explode('/', trim($folder, '/')) as $segment) {
            $path .= '/' . $segment;
            if (!DataObject::getByPath($path)) {
                $missing[] = $path;
            }
        }
        $made = DataObject\Service::createFolderByPath($folder);
        foreach ($missing as $created) {
            $created = DataObject::getByPath($created);
            $created?->setProperty(self::MARK, 'bool', true, false, false);
            $created?->save();
        }

        return $made;
    }

    /** @return list<DataObject\AbstractObject> the marked children of $folder (the demo's briefs and folders) */
    private static function ownedObjects(DataObject\Folder $folder): array
    {
        return array_values(array_filter(
            iterator_to_array($folder->getChildren([DataObject::OBJECT_TYPE_OBJECT, DataObject::OBJECT_TYPE_FOLDER], true), false),
            static fn (DataObject\AbstractObject $child): bool => (bool) $child->getProperty(self::MARK),
        ));
    }

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

    public function removeDemoFooter(int $portalId): ?array
    {
        $portal = Document\Page::getById($portalId, ['force' => true]);
        $snippet = $portal ? $this->demoFooter($portal) : null;
        if (!$snippet) {
            return null;
        }
        $wrapped = $snippet->getProperty(self::FOOTER_WRAPS);
        $wrapped = $wrapped instanceof Document ? $wrapped : null;
        if ($this->portalFooter($portalId)?->getId() === $snippet->getId()) {
            $portal->getEditables(); // keeps the other settings, as in enablePlugin()
            $portal->setRawEditable(PortalConfig::FOOTER_SNIPPET, 'relation', $wrapped
                ? ['id' => $wrapped->getId(), 'type' => 'document', 'subtype' => 'snippet']
                : ['id' => null, 'type' => null, 'subtype' => null]);
            $portal->save();
        }
        $snippet->delete();
        Cache::clearAll();

        return ['wrapsPath' => $wrapped?->getRealFullPath()];
    }

    public function startPageBricks(int $portalId): array
    {
        $root = Document\Page::getById($portalId, ['force' => true]);
        if (!$root) {
            return [];
        }
        $own = self::startBrickKeys($root);
        $bricks = [];
        foreach (self::areablockEntries($root) as $entry) {
            $key = (string) $entry['key'];
            $type = (string) $entry['type'];
            $brick = ['type' => $type, 'demo' => in_array($key, $own, true)];
            if ($brick['demo']) {
                $brick += $this->readBrick($root, $type, $key);
            }
            $bricks[] = $brick;
        }

        return $bricks;
    }

    /**
     * As an editor composes the start page in Studio: one areablock entry per brick and the bricks' editables under
     * "content:<key>.", the tiles in their block "content:<key>.tiles". The root also holds the portal's settings, so
     * its editables are loaded first and only the content ones are replaced; the cache holds the portal's config.
     */
    public function saveStartPage(int $portalId, array $bricks): void
    {
        $root = Document\Page::getById($portalId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal (document %d) is gone.', $portalId));
        $editables = $root->getEditables(); // keeps the portal's settings, as in enablePlugin()
        foreach (array_keys($editables) as $name) {
            if (str_starts_with((string) $name, self::AREABLOCK . ':')) {
                $root->removeEditable((string) $name);
            }
        }
        $entries = [];
        foreach (array_values($bricks) as $index => $brick) {
            $key = (string) ($index + 1);
            $entries[] = ['key' => $key, 'type' => $brick['type'], 'hidden' => false];
            $this->writeBrick($root, $portalId, $brick, $key);
        }
        $root->setRawEditable(self::AREABLOCK, 'areablock', $entries);
        $root->setProperty(self::START_BRICKS, 'text', implode(',', array_column($entries, 'key')), false, false);
        $root->save();
        Cache::clearAll();
    }

    public function frontendVariant(int $portalId): ?string
    {
        $data = Document\Page::getById($portalId, ['force' => true])?->getEditable(PortalConfig::FRONTEND_VARIANT)?->getData();

        return $data === null ? null : (string) $data;
    }

    /** As the portal's "Frontend" select saves it (portal_engine's DefaultValuesService on a new portal); the cache holds the config. */
    public function setFrontendVariant(int $portalId, string $variant): void
    {
        $portal = Document\Page::getById($portalId, ['force' => true])
            ?? throw new \RuntimeException(sprintf('The demo portal (document %d) is gone.', $portalId));
        $portal->getEditables(); // keeps the other settings, as in enablePlugin()
        $portal->setRawEditable(PortalConfig::FRONTEND_VARIANT, 'select', $variant);
        $portal->save();
        Cache::clearAll();
    }

    public function removeStartPage(int $portalId): void
    {
        $root = Document\Page::getById($portalId, ['force' => true]);
        if (!$root) {
            return;
        }
        $own = self::startBrickKeys($root);
        $editables = $root->getEditables();
        foreach ($own as $key) {
            $prefix = self::AREABLOCK . ':' . $key . '.';
            foreach (array_keys($editables) as $name) {
                if (str_starts_with((string) $name, $prefix)) {
                    $root->removeEditable((string) $name);
                }
            }
        }
        $left = array_values(array_filter(self::areablockEntries($root), static fn (array $entry): bool => !in_array((string) $entry['key'], $own, true)));
        $root->setRawEditable(self::AREABLOCK, 'areablock', $left);
        $root->removeProperty(self::START_BRICKS);
        $root->save();
        Cache::clearAll();
    }

    /** @return list<string> the keys of the root's content bricks the demo wrote */
    private static function startBrickKeys(Document\Page $root): array
    {
        $keys = (string) $root->getProperty(self::START_BRICKS);

        return $keys === '' ? [] : explode(',', $keys);
    }

    /** @return list<array{key: string, type: string}> the root's content areablock entries */
    private static function areablockEntries(Document\Page $root): array
    {
        $block = $root->getEditable(self::AREABLOCK);

        return array_values(array_filter((array) ($block instanceof Editable\Areablock ? $block->getData() : []), 'is_array'));
    }

    /** A demo brick's fields, as StartPage::startPageBricks() gives them. */
    private function readBrick(Document\Page $root, string $type, string $key): array
    {
        $at = static fn (string $name, ?string $tiles = null): string => self::AREABLOCK . ':' . $key . '.' . ($tiles === null ? '' : 'tiles:' . $tiles . '.') . $name;
        $text = static fn (string $name): string => (string) ($root->getEditable($name)?->getData() ?? '');
        $image = static function (string $name) use ($root): ?string {
            $editable = $root->getEditable($name);

            return $editable instanceof Editable\Image ? $editable->getImage()?->getRealFullPath() : null;
        };

        switch ($type) {
            case CoasterDemo::FEATURE_BRICK:
                $link = $root->getEditable($at('link'));
                $alt = $root->getEditable($at('image'));

                return ['variant' => $text($at('variant')), 'eyebrow' => $text($at('eyebrow')), 'title' => $text($at('title')),
                    'description' => $text($at('description')), 'image' => $image($at('image')),
                    'alt' => $alt instanceof Editable\Image ? $alt->getAlt() : '',
                    'link' => ['page' => $this->linkTarget($link), 'text' => $link instanceof Editable\Link ? (string) $link->getText() : '']];
            case CoasterDemo::HERO_BRICK:
                return ['headline' => $text($at('headline')), 'intro' => $text($at('intro'))];
            case CoasterDemo::TILES_BRICK:
                $block = $root->getEditable($at('tiles'));
                $tiles = [];
                foreach ((array) ($block instanceof Editable\Block ? $block->getData() : []) as $index) {
                    $tiles[] = ['title' => $text($at('title', (string) $index)), 'meta' => $text($at('meta', (string) $index)),
                        'cta' => $text($at('cta', (string) $index)), 'icon' => $text($at('icon1', (string) $index)),
                        'image' => $image($at('image1', (string) $index)), 'link' => $this->linkTarget($root->getEditable($at('link', (string) $index)))];
                }

                return ['size' => $text($at('size')), 'tiles' => $tiles];
        }

        return [];
    }

    /** Sets a brick's editables, as its template (portal_engine's Areas/<type>/view.html.twig) names them. */
    private function writeBrick(Document\Page $root, int $portalId, array $brick, string $key): void
    {
        $at = static fn (string $name, ?int $tile = null): string => self::AREABLOCK . ':' . $key . '.' . ($tile === null ? '' : 'tiles:' . $tile . '.') . $name;
        switch ($brick['type']) {
            case CoasterDemo::FEATURE_BRICK:
                $root->setRawEditable($at('variant'), 'select', $brick['variant']);
                $root->setRawEditable($at('eyebrow'), 'input', $brick['eyebrow']);
                $root->setRawEditable($at('title'), 'input', $brick['title']);
                $root->setRawEditable($at('description'), 'wysiwyg', $brick['description']);
                $root->setRawEditable($at('image'), 'image', ['id' => $this->imageId($brick['image']), 'alt' => $brick['alt']]);
                $root->setRawEditable($at('link'), 'link', $this->link($portalId, $brick['link']['page'], $brick['link']['text']));
                break;
            case CoasterDemo::HERO_BRICK:
                $root->setRawEditable($at('headline'), 'input', $brick['headline']);
                $root->setRawEditable($at('intro'), 'textarea', $brick['intro']);
                break;
            case CoasterDemo::TILES_BRICK:
                // before the block, as the template renders it (content:<key>.size, not inside the tiles)
                $root->setRawEditable($at('size'), 'select', $brick['size']);
                $indices = [];
                foreach (array_values($brick['tiles']) as $i => $tile) {
                    $index = $i + 1;
                    $indices[] = $index;
                    $root->setRawEditable($at('title', $index), 'input', $tile['title']);
                    $root->setRawEditable($at('meta', $index), 'input', $tile['meta']);
                    $root->setRawEditable($at('cta', $index), 'input', $tile['cta']);
                    $root->setRawEditable($at('icon1', $index), 'select', $tile['icon']);
                    $root->setRawEditable($at('image1', $index), 'image', ['id' => $this->imageId($tile['image'])]);
                    $root->setRawEditable($at('link', $index), 'link', $this->link($portalId, $tile['link'], ''));
                }
                $root->setRawEditable($at('tiles'), 'block', $indices);
                break;
            default:
                throw new \RuntimeException(sprintf('The start page has no brick "%s".', $brick['type']));
        }
    }

    private function imageId(string $path): int
    {
        $image = Asset::getByPath($path);
        if (!$image instanceof Asset\Image) {
            throw new \RuntimeException(sprintf('The start page picture %s is not an image asset.', $path));
        }

        return $image->getId();
    }

    /** A link editable's data to a page setup made ("page:<key>" or "data-pool:<name>"), as the link dialog saves it. */
    private function link(int $portalId, string $target, string $text): array
    {
        $page = match (true) {
            str_starts_with($target, 'page:') => $this->demoPage($portalId, substr($target, 5)),
            str_starts_with($target, 'data-pool:') => $this->dataPool($portalId, substr($target, 10)),
            default => null,
        } ?? throw new \RuntimeException(sprintf('The start page links to %s, which the demo portal does not have.', $target));

        return ['path' => $page->getRealFullPath(), 'linktype' => 'internal', 'internalType' => 'document', 'text' => $text];
    }

    /** The page a link editable points at, as link() names it, or its path for another document; null for none. */
    private function linkTarget(?Editable $link): ?string
    {
        $data = $link instanceof Editable\Link ? $link->getData() : null;
        $page = is_array($data) && ($data['internalType'] ?? null) === 'document' ? Document::getById((int) ($data['internalId'] ?? 0)) : null;
        if (!$page instanceof Document\Page) {
            return null;
        }
        if (in_array($page->getController(), [ControllerReference::DATA_POOL_ASSETS_LIST, ControllerReference::DATA_POOL_DATA_OBJECTS_LIST], true)) {
            return 'data-pool:' . $page->getTitle();
        }
        if ($page->getProperty(self::MARK)) {
            $own = $page->getProperty(self::PAGE_KEY);

            return 'page:' . ($own === null || $own === '' ? $page->getKey() : $own);
        }

        return $page->getRealFullPath();
    }

    /** The snippet the portal's configuration names as its footer, or null. */
    private function portalFooter(int $portalId): ?Document\Snippet
    {
        $relation = Document\Page::getById($portalId, ['force' => true])?->getEditable(PortalConfig::FOOTER_SNIPPET);
        $snippet = $relation instanceof Editable\Relation ? $relation->getElement() : null;

        return $snippet instanceof Document\Snippet ? $snippet : null;
    }

    /** The footer snippet an earlier demo wrote in the portal's tree (a marked snippet), or null. */
    private function demoFooter(Document\Page $portal): ?Document\Snippet
    {
        $list = new Document\Listing();
        $list->setCondition('`type` = ? AND `path` LIKE ?', ['snippet', $portal->getRealFullPath() . '/%']);
        foreach ($list as $snippet) {
            if ($snippet instanceof Document\Snippet && $snippet->getProperty(self::MARK)) {
                return $snippet;
            }
        }

        return null;
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

    /** A data pool page (the asset one the wizard made, or the demo's briefs): in the portal's language root (or the portal page itself). */
    private function dataPool(int $portalId, string $dataPoolName): ?Document\Page
    {
        $portal = Document\Page::getById($portalId);
        if (!$portal) {
            return null;
        }
        foreach ([$portal, ...iterator_to_array($portal->getChildren(), false)] as $parent) {
            foreach ($parent->getChildren() as $child) {
                if ($child instanceof Document\Page
                    && in_array($child->getController(), [ControllerReference::DATA_POOL_ASSETS_LIST, ControllerReference::DATA_POOL_DATA_OBJECTS_LIST], true)
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
