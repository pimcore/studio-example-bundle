<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\Pimcore;

use Carbon\Carbon;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\FeedbackStore;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\ScreamScore\GuestFeedback;
use Pimcore\Model\Asset;
use Pimcore\Model\DataObject;

/**
 * The FeedbackStore of the running demo: every rating is a published GuestFeedback data object (the class
 * coaster-demo:setup creates, F316) at a fixed path, `/Pimcore Kingdom/Guest feedback/<ride key>-<pass number>`, so
 * saving a pass's rating of a ride again replaces it. Its `ride` field links the coaster's asset
 * (`<ride key>.coaster` under /Pimcore Kingdom/Ride designs); the ride key itself comes from the object key, so a
 * rating keeps its ride when the demo reset uploads the coaster again (and setup links it anew).
 */
class PimcoreFeedbackStore implements FeedbackStore
{
    public const CLASS_NAME = 'GuestFeedback';

    public const FOLDER = '/Pimcore Kingdom/Guest feedback';

    /** Where the coasters are (CoasterDemo::RIDE_DESIGNS_FOLDER). */
    public const RIDES_FOLDER = '/Pimcore Kingdom/Ride designs';

    /** The property every element the coaster demo creates carries (PimcoreDemoEnvironment::MARK). */
    public const MARK = 'coaster-demo';

    /** The object key of a pass's rating of a ride. */
    public static function key(string $ride, string $passNumber): string
    {
        return $ride . '-' . $passNumber;
    }

    public function findByPassAndRide(string $passNumber, string $ride): ?GuestFeedback
    {
        $object = DataObject::getByPath(self::FOLDER . '/' . self::key($ride, $passNumber), ['force' => true]);

        return $object instanceof DataObject\Concrete ? self::feedback($object) : null;
    }

    /** Only a GuestFeedback object directly in the feedback folder counts: any other id gives null. */
    public function find(int $id): ?GuestFeedback
    {
        $object = DataObject::getById($id, ['force' => true]);

        return $object instanceof DataObject\Concrete && $object->getParent()?->getRealFullPath() === self::FOLDER
            ? self::feedback($object)
            : null;
    }

    public function forRide(string $ride): array
    {
        return array_values(array_filter(
            array_map(self::feedback(...), $this->objects()),
            static fn (?GuestFeedback $feedback): bool => $feedback !== null && $feedback->ride === $ride,
        ));
    }

    public function save(GuestFeedback $feedback): GuestFeedback
    {
        $key = self::key($feedback->ride, $feedback->passNumber);
        $object = $feedback->id !== null ? DataObject::getById($feedback->id, ['force' => true]) : null;
        $object ??= DataObject::getByPath(self::FOLDER . '/' . $key, ['force' => true]);
        if (!$object instanceof DataObject\Concrete) {
            $class = '\\Pimcore\\Model\\DataObject\\' . self::CLASS_NAME;
            /** @var DataObject\Concrete $object */
            $object = new $class();
            $object->setParent($this->folder());
            $object->setKey($key);
            $object->setProperty(self::MARK, 'bool', true, false, false);
        }
        $object->set('ride', $this->coaster($feedback->ride));
        $object->set('screamScore', $feedback->screamScore);
        $object->set('comment', $feedback->comment);
        $object->set('passNumber', $feedback->passNumber);
        $object->set('visible', $feedback->visible);
        $object->set('createdAt', Carbon::instance(\DateTime::createFromImmutable($feedback->createdAt)));
        $object->setPublished(true);
        $object->save();

        return $feedback->withId((int) $object->getId());
    }

    /** The ride's coaster asset: `<ride>.coaster` in $folder or below it, or null. */
    public function coaster(string $ride, string $folder = self::RIDES_FOLDER): ?Asset
    {
        $assets = new Asset\Listing();
        $assets->setCondition('`filename` = ? AND (`path` = ? OR `path` LIKE ?)', [$ride . '.coaster', $folder . '/', $folder . '/%']);
        $assets->setOrderKey('id');
        $assets->setLimit(1);

        return $assets->getAssets()[0] ?? null;
    }

    /**
     * The GuestFeedback objects in the feedback folder.
     *
     * @return list<DataObject\Concrete>
     */
    public function objects(): array
    {
        $folder = DataObject::getByPath(self::FOLDER);
        if (!$folder instanceof DataObject\Folder) {
            return [];
        }

        return array_values(array_filter(
            iterator_to_array($folder->getChildren([DataObject::OBJECT_TYPE_OBJECT], true), false),
            static fn (DataObject\AbstractObject $child): bool => $child instanceof DataObject\Concrete && $child->getClassName() === self::CLASS_NAME,
        ));
    }

    /** The rating an object holds; null if it is no GuestFeedback or its key does not end in its pass number. */
    public static function feedback(DataObject\Concrete $object): ?GuestFeedback
    {
        if ($object->getClassName() !== self::CLASS_NAME) {
            return null;
        }
        $passNumber = (string) $object->get('passNumber');
        $suffix = '-' . $passNumber;
        $key = (string) $object->getKey();
        if ($passNumber === '' || !str_ends_with($key, $suffix)) {
            return null;
        }
        $createdAt = $object->get('createdAt');
        $comment = $object->get('comment');

        return new GuestFeedback(
            (int) $object->getId(),
            substr($key, 0, -strlen($suffix)),
            (int) $object->get('screamScore'),
            $comment === null || $comment === '' ? null : (string) $comment,
            $passNumber,
            (bool) $object->get('visible'),
            $createdAt instanceof \DateTimeInterface ? \DateTimeImmutable::createFromInterface($createdAt) : new \DateTimeImmutable('@0'),
        );
    }

    /** The feedback folder; made, and marked as the demo's, when missing. */
    private function folder(): DataObject\Folder
    {
        $existing = DataObject::getByPath(self::FOLDER);
        if ($existing instanceof DataObject\Folder) {
            return $existing;
        }
        $folder = DataObject\Service::createFolderByPath(self::FOLDER);
        $folder->setProperty(self::MARK, 'bool', true, false, false);
        $folder->save();

        return $folder;
    }
}
