<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo;

use Pimcore\Bundle\PortalEngineBundle\Enum\Document\ControllerReference;
use Pimcore\Bundle\PortalEngineBundle\Enum\Wizard;
use Pimcore\Bundle\PortalEngineBundle\Service\Wizard\WizardService;
use Pimcore\Model\Asset;
use Pimcore\Model\DataObject;
use Pimcore\Model\DataObject\Data\ElementMetadata;
use Pimcore\Model\DataObject\PortalUser;
use Pimcore\Model\Document;
use Pimcore\Model\Document\Editable;
use Pimcore\Model\Element\ElementInterface;
use Pimcore\Model\Site;
use Pimcore\Model\Tool\TmpStore;

/**
 * The demo on Pimcore and the Portal Engine. The portal is made by the Portal Engine's own wizard (the same code the
 * Studio "Create portal" wizard runs, here in the foreground); the supplier is a PortalUser object; the coaster is an
 * asset created like an upload, so the coaster listener fills its metadata. Every element the demo creates gets the
 * property "coaster-demo", and only elements with it are found as the demo's or deleted.
 */
class PimcoreDemoEnvironment implements DemoEnvironment
{
    public const MARK = 'coaster-demo';

    public const USER_FOLDER = '/Portal Users/Coaster demo';

    public const USER_KEY = 'loopwerk-supplier';

    public const BRIEF_KEY = 'brief';

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

    public function deletePortal(int $portalId): void
    {
        Site::getByRootId($portalId)?->delete();
        Document::getById($portalId)?->delete();
    }

    public function briefHtml(int $portalId): ?string
    {
        $brief = $this->briefPage($portalId);
        $editable = $brief?->getEditable(self::wysiwygName());

        return $editable ? (string) $editable->getData() : null;
    }

    public function saveBrief(int $portalId, string $title, string $html): void
    {
        $brief = $this->briefPage($portalId);
        if (!$brief) {
            $languageRoot = $this->languageRoot($portalId)
                ?? throw new \RuntimeException('The demo portal has no page for the brief to go under.');
            $brief = new Document\Page();
            $brief->setKey(self::BRIEF_KEY);
            $brief->setParent($languageRoot);
            $brief->setController(ControllerReference::PORTAL_CONTENT_PAGE);
            $brief->setPublished(true);
            $brief->setProperty(self::MARK, 'bool', true, false, false);
        }
        $brief->setTitle($title);
        $brief->setProperty('navigation_name', 'text', $title);
        $brief->setRawEditable(self::AREABLOCK, 'areablock', [['key' => '1', 'type' => self::BRICK, 'hidden' => false]]);
        $brief->setRawEditable(self::wysiwygName(), 'wysiwyg', $html);
        $brief->save();
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
            $folder = Asset\Service::createFolderByPath($path);
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
        // Mark the folders this creates, so a full reset may delete them; folders that were there stay unmarked.
        $missing = [];
        $path = '';
        foreach (explode('/', trim($folder, '/')) as $segment) {
            $path .= '/' . $segment;
            if (!Asset::getByPath($path)) {
                $missing[] = $path;
            }
        }
        $parent = Asset\Service::createFolderByPath($folder);
        foreach ($missing as $created) {
            $created = Asset::getByPath($created);
            $created?->setProperty(self::MARK, 'bool', true, false, false);
            $created?->save();
        }

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

        return $asset instanceof Asset\Folder && (bool) $asset->getProperty(self::MARK);
    }

    public function deleteFolder(string $folder): void
    {
        if ($this->folderExists($folder)) {
            Asset::getByPath($folder)->delete();
        }
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

    private function briefPage(int $portalId): ?Document\Page
    {
        $languageRoot = $this->languageRoot($portalId);
        $brief = $languageRoot ? Document::getByPath($languageRoot->getRealFullPath() . '/' . self::BRIEF_KEY) : null;

        return $brief instanceof Document\Page && $brief->getProperty(self::MARK) ? $brief : null;
    }
}
