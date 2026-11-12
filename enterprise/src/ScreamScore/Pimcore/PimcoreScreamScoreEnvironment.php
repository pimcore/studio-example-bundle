<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\DemoEnvironment;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\ScreamScoreEnvironment;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\GuestFeedback;
use Pimcore\Model\Asset;
use Pimcore\Model\DataObject;
use Pimcore\Model\DataObject\PortalUser;
use Pimcore\Model\DataObject\PortalUserGroup;

/**
 * The scream score demo on Pimcore and the Portal Engine (F316): the GuestFeedback class made in code, the ratings
 * through PimcoreFeedbackStore, the passes through PimcoreAnnualPasses, and the park staff as a PortalUserGroup
 * object (its key is the group's name) and a PortalUser in it. What the demo creates carries the property
 * "coaster-demo"; only that is deleted.
 */
class PimcoreScreamScoreEnvironment implements ScreamScoreEnvironment
{
    public const MARK = PimcoreFeedbackStore::MARK;

    /** The id of the GuestFeedback class. */
    public const CLASS_ID = 'guestfeedback';

    /** Where the demo's portal users and the staff group are (PimcoreDemoEnvironment::USER_FOLDER). */
    public const USER_FOLDER = '/Portal Users/Coaster demo';

    public const STAFF_USER_KEY = 'park-staff';

    // Pimcore's field types for ScreamScoreEnvironment's plain type names.
    private const FIELD_TYPES = [
        'relation' => DataObject\ClassDefinition\Data\ManyToOneRelation::class,
        'numeric' => DataObject\ClassDefinition\Data\Numeric::class,
        'textarea' => DataObject\ClassDefinition\Data\Textarea::class,
        'input' => DataObject\ClassDefinition\Data\Input::class,
        'checkbox' => DataObject\ClassDefinition\Data\Checkbox::class,
        'datetime' => DataObject\ClassDefinition\Data\Datetime::class,
    ];

    public function __construct(
        private readonly DemoEnvironment $demo,
        private readonly PimcoreFeedbackStore $store,
        private readonly PimcoreAnnualPasses $passes,
    ) {
    }

    public function portalId(): ?int
    {
        return $this->demo->portalId();
    }

    public function feedbackClassFields(string $className): ?array
    {
        $class = DataObject\ClassDefinition::getByName($className);
        if (!$class) {
            return null;
        }
        $types = array_flip(self::FIELD_TYPES);
        $fields = [];
        foreach ($class->getFieldDefinitions() as $name => $definition) {
            $fields[$name] = [$types[$definition::class] ?? $definition->getFieldtype(), (string) $definition->getTitle()];
        }

        return $fields;
    }

    /** One panel with the fields, as the class editor saves it: a whole score 1-10, the ride an asset relation. */
    public function saveFeedbackClass(string $className, string $title, string $group, array $fields): void
    {
        $class = DataObject\ClassDefinition::getByName($className);
        if (!$class) {
            $class = new DataObject\ClassDefinition();
            $class->setId(self::CLASS_ID);
            $class->setName($className);
        }
        $class->setTitle($title);
        $class->setGroup($group);

        $panel = new DataObject\ClassDefinition\Layout\Panel();
        $panel->setName('Feedback');
        $panel->setTitle($title);
        foreach ($fields as $name => [$type, $fieldTitle]) {
            $fieldClass = self::FIELD_TYPES[$type] ?? throw new \RuntimeException(sprintf('No Pimcore field type for "%s".', $type));
            $definition = new $fieldClass();
            $definition->setName($name);
            $definition->setTitle($fieldTitle);
            if ($definition instanceof DataObject\ClassDefinition\Data\ManyToOneRelation) {
                $definition->setAssetsAllowed(true);
            }
            if ($definition instanceof DataObject\ClassDefinition\Data\Numeric) {
                $definition->setInteger(true);
                $definition->setMinValue(1);
                $definition->setMaxValue(10);
            }
            $panel->addChild($definition);
        }
        $root = new DataObject\ClassDefinition\Layout\Panel();
        $root->setName('pimcore_root');
        $root->addChild($panel);
        $class->setLayoutDefinitions($root);
        $class->save();
    }

    public function deleteFeedbackClass(string $className): void
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
        $class->delete();
        // ClassDefinition::delete() removes them already; a file left by an earlier, failed run goes too.
        foreach ([
            PIMCORE_CLASS_DIRECTORY . '/DataObject/' . $className . '.php',
            PIMCORE_CLASS_DIRECTORY . '/DataObject/' . $className . '/Listing.php',
            PIMCORE_CLASS_DEFINITION_DIRECTORY . '/definition_' . $className . '.php',
        ] as $file) {
            if (is_file($file)) {
                unlink($file);
            }
        }
        $listingDir = PIMCORE_CLASS_DIRECTORY . '/DataObject/' . $className;
        if (is_dir($listingDir) && scandir($listingDir) === ['.', '..']) {
            rmdir($listingDir);
        }
    }

    public function rides(string $folder): array
    {
        $assets = new Asset\Listing();
        $assets->setCondition('`filename` LIKE ? AND `path` LIKE ?', ['%.coaster', $folder . '/%']);
        $rides = array_unique(array_map(
            static fn (Asset $asset): string => substr((string) $asset->getFilename(), 0, -strlen('.coaster')),
            $assets->getAssets(),
        ));
        sort($rides);

        return array_values($rides);
    }

    public function coasterAssetId(string $folder, string $ride): ?int
    {
        return $this->store->coaster($ride, $folder)?->getId();
    }

    public function ratings(): array
    {
        $ratings = [];
        foreach ($this->store->objects() as $object) {
            $feedback = PimcoreFeedbackStore::feedback($object);
            if ($feedback !== null) {
                $ride = $object->get('ride');
                $ratings[(string) $object->getKey()] = ['feedback' => $feedback, 'rideAsset' => $ride instanceof Asset ? $ride->getId() : null];
            }
        }

        return $ratings;
    }

    public function saveRating(GuestFeedback $feedback): void
    {
        $this->store->save($feedback);
    }

    public function deleteRating(string $key): void
    {
        $object = DataObject::getByPath(PimcoreFeedbackStore::FOLDER . '/' . $key, ['force' => true]);
        if ($object instanceof DataObject\Concrete && $object->getClassName() === PimcoreFeedbackStore::CLASS_NAME) {
            $object->delete();
        }
    }

    public function feedbackFolderExists(): bool
    {
        $folder = DataObject::getByPath(PimcoreFeedbackStore::FOLDER);

        return $folder instanceof DataObject\Folder && (bool) $folder->getProperty(self::MARK);
    }

    public function deleteFeedbackFolder(): void
    {
        if ($this->feedbackFolderExists()) {
            DataObject::getByPath(PimcoreFeedbackStore::FOLDER)?->delete();
        }
    }

    public function passHashes(): ?array
    {
        return $this->passes->all();
    }

    public function savePassHashes(array $hashes): void
    {
        $this->passes->save($hashes);
    }

    public function deletePassHashes(): void
    {
        $this->passes->delete();
    }

    public function staffGroup(string $name): ?array
    {
        $group = $this->group($name);

        return $group === null ? null : ['permissions' => (array) $group->getPermission()];
    }

    public function saveStaffGroup(string $name, array $permissions): void
    {
        $group = $this->group($name);
        if ($group === null) {
            $group = new PortalUserGroup();
            $group->setParent(DataObject\Service::createFolderByPath(self::USER_FOLDER));
            $group->setKey($name);
            $group->setProperty(self::MARK, 'bool', true, false, false);
        }
        $group->setPermission([...(array) $group->getPermission(), ...$permissions]);
        $group->setPublished(true);
        $group->save();
    }

    public function deleteStaffGroup(string $name): void
    {
        $group = $this->group($name);
        if ($group !== null && $group->getProperty(self::MARK)) {
            $group->delete();
        }
    }

    public function staffUser(string $email, string $password): ?array
    {
        $user = $this->portalUser($email);
        if ($user === null) {
            return null;
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
            'groups' => array_values(array_map(static fn (DataObject\AbstractObject $group): string => (string) $group->getKey(), (array) $user->getGroups())),
        ];
    }

    public function saveStaffUser(array $user): void
    {
        $portalUser = $this->portalUser($user['email']);
        if ($portalUser === null) {
            $portalUser = new PortalUser();
            $portalUser->setParent(DataObject\Service::createFolderByPath(self::USER_FOLDER));
            $portalUser->setKey(self::STAFF_USER_KEY);
            $portalUser->setPublished(true);
            $portalUser->setProperty(self::MARK, 'bool', true, false, false);
        }
        $portalUser->setEmail($user['email']);
        $portalUser->setFirstname($user['firstname']);
        $portalUser->setLastname($user['lastname']);
        $portalUser->setUsePimcoreUserPassword(false);
        $portalUser->setPortalPassword($user['password']);
        $portalUser->setPermission([...(array) $portalUser->getPermission(), ...$user['permissions']]);
        $groups = array_map(
            fn (string $name): PortalUserGroup => $this->group($name) ?? throw new \RuntimeException(sprintf('There is no portal user group "%s".', $name)),
            $user['groups'],
        );
        $portalUser->setGroups($groups);
        $portalUser->save();
    }

    public function deleteStaffUser(string $email): void
    {
        $user = $this->portalUser($email);
        if ($user !== null && $user->getProperty(self::MARK)) {
            $user->delete();
        }
    }

    private function group(string $name): ?PortalUserGroup
    {
        $group = DataObject::getByPath(self::USER_FOLDER . '/' . $name, ['force' => true]);

        return $group instanceof PortalUserGroup ? $group : null;
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
}
