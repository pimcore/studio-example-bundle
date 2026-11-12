<?php
// F322: in-memory stand-ins for what GuestShares uses of the Portal Engine (its public share service, the PublicShare
// model and its items, the entity manager, the data pools), of Pimcore (Site, Asset, PortalUser, a document page) and
// of the Symfony router. Like the real ones where GuestShares relies on them; PublicShareService::create() fails as it
// does on the command line, where there is no logged-in portal user and no current Site.

namespace Symfony\Component\Routing {
    class RequestContext {
        public function __construct(private string $host = 'localhost', private string $scheme = 'http') {}
        public function getHost(): string { return $this->host; }
        public function setHost(string $host): static { $this->host = strtolower($host); return $this; }
        public function getScheme(): string { return $this->scheme; }
        public function setScheme(string $scheme): static { $this->scheme = strtolower($scheme); return $this; }
    }
    interface RequestContextAwareInterface {
        public function setContext(RequestContext $context): void;
        public function getContext(): RequestContext;
    }
}
namespace Symfony\Component\Routing\Generator {
    use Symfony\Component\Routing\RequestContext;
    use Symfony\Component\Routing\RequestContextAwareInterface;

    interface UrlGeneratorInterface extends RequestContextAwareInterface {
        public const ABSOLUTE_URL = 0;
        public const ABSOLUTE_PATH = 1;
        public function generate(string $name, array $parameters = [], int $referenceType = self::ABSOLUTE_PATH): string;
    }

    // The one route GuestShares needs, as portal_engine's PublicShareController declares it.
    class StubUrlGenerator implements UrlGeneratorInterface {
        public const ROUTES = ['pimcore_portalengine_public_share_public_asset_detail' => '/{documentPath}/{publicShareHash}/public-share-a~{id}'];
        private RequestContext $context;
        public function __construct() { $this->context = new RequestContext(); }
        public function setContext(RequestContext $context): void { $this->context = $context; }
        public function getContext(): RequestContext { return $this->context; }
        public function generate(string $name, array $parameters = [], int $referenceType = self::ABSOLUTE_PATH): string {
            $path = self::ROUTES[$name] ?? throw new \RuntimeException("no route $name");
            $path = preg_replace_callback('/\{(\w+)\}/', function ($m) use ($parameters) {
                if (!array_key_exists($m[1], $parameters)) { throw new \RuntimeException("missing route parameter {$m[1]}"); }
                return $m[1] === 'documentPath' ? (string) $parameters[$m[1]] : rawurlencode((string) $parameters[$m[1]]);
            }, $path);
            return $referenceType === self::ABSOLUTE_URL ? $this->context->getScheme() . '://' . $this->context->getHost() . $path : $path;
        }
    }
}
namespace Pimcore\Model {
    class Site {
        public static array $byRootId = [];
        private static ?Site $current = null;
        public function __construct(private int $id, private int $rootId, private string $rootPath, private string $mainDomain) {}
        public static function getByRootId(int $id): ?Site { return self::$byRootId[$id] ?? null; }
        public static function isSiteRequest(): bool { return self::$current !== null; }
        public static function getCurrentSite(): Site { return self::$current ?? throw new \Exception('This request/process is not inside a subsite'); }
        public static function setCurrentSite(Site $site): void { self::$current = $site; }
        public function getId(): ?int { return $this->id; }
        public function getRootId(): int { return $this->rootId; }
        public function getRootPath(): ?string { return $this->rootPath; }
        public function getMainDomain(): string { return $this->mainDomain; }
    }
    class Asset {
        public static array $byId = [];
        public function __construct(private int $id, private string $type = 'unknown') { self::$byId[$id] = $this; }
        public static function getById(int|string $id, array $params = []): ?static { return self::$byId[(int) $id] ?? null; }
        public function getId(): ?int { return $this->id; }
        public function getType(): string { return $this->type; }
    }
}
namespace Pimcore\Model\Document {
    class Page {
        public function __construct(private int $id, private string $realFullPath) {}
        public function getId(): ?int { return $this->id; }
        public function getRealFullPath(): string { return $this->realFullPath; }
        public function __toString(): string { return $this->realFullPath; }
    }
}
namespace Pimcore\Model\DataObject {
    class PortalUser {
        public static array $byEmail = [];
        public function __construct(private int $id, string $email) { self::$byEmail[$email] = $this; }
        public static function getByEmail(mixed $value, ?int $limit = null, int $offset = 0, ?array $objectTypes = null): mixed {
            return $limit === 1 ? (self::$byEmail[$value] ?? null) : array_filter([self::$byEmail[$value] ?? null]);
        }
        public function getId(): ?int { return $this->id; }
    }
}
namespace Pimcore\Bundle\PortalEngineBundle\Entity {
    class PublicShare {
        private ?int $id = null; private ?int $collectionId = null; private string $hash = ''; private string $name = '';
        private int $userId = 0; private int $currentSiteId = 0; private ?int $expiryDate = null; private bool $showTermsText = false;
        private ?string $termsText = null; private array $configs = []; private int $creationDate = 0; private int $modificationDate = 0;
        public function getId(): int { return $this->id; } public function setId(int $id): self { $this->id = $id; return $this; }
        public function hasId(): bool { return $this->id !== null; }
        public function getCollectionId(): ?int { return $this->collectionId; } public function setCollectionId(?int $v): self { $this->collectionId = $v; return $this; }
        public function getHash(): string { return $this->hash; } public function setHash(string $v): self { $this->hash = $v; return $this; }
        public function getName(): string { return $this->name; } public function setName(string $v): self { $this->name = $v; return $this; }
        public function getUserId(): int { return $this->userId; } public function setUserId(int $v): self { $this->userId = $v; return $this; }
        public function getCurrentSiteId(): int { return $this->currentSiteId; } public function setCurrentSiteId(int $v): self { $this->currentSiteId = $v; return $this; }
        public function getExpiryDate(): ?int { return $this->expiryDate; } public function setExpiryDate(?int $v): self { $this->expiryDate = $v; return $this; }
        public function isShowTermsText(): bool { return $this->showTermsText; } public function setShowTermsText(bool $v): self { $this->showTermsText = $v; return $this; }
        public function getTermsText(): ?string { return $this->termsText; } public function setTermsText(?string $v): self { $this->termsText = $v; return $this; }
        public function getConfigs(): array { return $this->configs; } public function setConfigs(array $v): self { $this->configs = $v; return $this; }
        public function getCreationDate(): int { return $this->creationDate; } public function setCreationDate(int $v): self { $this->creationDate = $v; return $this; }
        public function getModificationDate(): int { return $this->modificationDate; } public function setModificationDate(int $v): self { $this->modificationDate = $v; return $this; }
        public function toArray(): array {
            return ['id' => $this->id, 'collectionId' => $this->collectionId, 'hash' => $this->hash, 'name' => $this->name, 'userId' => $this->userId,
                'currentSiteId' => $this->currentSiteId, 'expiryDate' => $this->expiryDate, 'showTermsText' => $this->showTermsText,
                'termsText' => $this->termsText, 'configs' => $this->configs];
        }
    }
    class PublicShareItem {
        private ?PublicShare $publicShare = null; private int $elementId = 0; private string $elementType = ''; private string $elementSubType = ''; private int $dataPoolId = 0;
        public function getPublicShare(): ?PublicShare { return $this->publicShare; } public function setPublicShare(?PublicShare $v): self { $this->publicShare = $v; return $this; }
        public function getElementId(): int { return $this->elementId; } public function setElementId(int $v): self { $this->elementId = $v; return $this; }
        public function getElementType(): string { return $this->elementType; } public function setElementType(string $v): self { $this->elementType = $v; return $this; }
        public function getElementSubType(): string { return $this->elementSubType; } public function setElementSubType(string $v): self { $this->elementSubType = $v; return $this; }
        public function getDataPoolId(): int { return $this->dataPoolId; } public function setDataPoolId(int $v): self { $this->dataPoolId = $v; return $this; }
        public function toArray(): array {
            return ['elementId' => $this->elementId, 'elementType' => $this->elementType, 'elementSubType' => $this->elementSubType, 'dataPoolId' => $this->dataPoolId];
        }
    }
}
namespace Pimcore\Bundle\PortalEngineBundle\Service\Entity {
    use Pimcore\Bundle\PortalEngineBundle\Entity\PublicShare;
    use Pimcore\Bundle\PortalEngineBundle\Entity\PublicShareItem;

    class StubRepository {
        public function __construct(private EntityManagerService $entities, private string $class) {}
        public function findBy(array $criteria): array {
            return array_values(array_filter($this->entities->all($this->class), function ($row) use ($criteria) {
                foreach ($criteria as $field => $value) {
                    $got = $row->{'get' . ucfirst($field)}();
                    if (is_object($value) ? $got !== $value : $got != $value) { return false; }
                }
                return true;
            }));
        }
        public function findOneBy(array $criteria): ?object { return $this->findBy($criteria)[0] ?? null; }
    }
    class StubManager {
        public function __construct(private EntityManagerService $entities) {}
        public function getRepository(string $class): StubRepository { return new StubRepository($this->entities, $class); }
    }
    class EntityManagerService {
        /** @var array<string, object[]> by class, what is saved; persist/remove before a flush count as saved here */
        private array $rows = [PublicShare::class => [], PublicShareItem::class => []];
        private int $nextId = 700;
        public int $writes = 0;
        public function getManager(?string $name = null): StubManager { return new StubManager($this); }
        public function all(string $class): array { return $this->rows[$class] ?? []; }
        public function persist($object, bool $flush = true): void {
            $this->writes++;
            if ($object instanceof PublicShare && !$object->hasId()) { $object->setId($this->nextId++); }
            if (!in_array($object, $this->rows[$object::class], true)) { $this->rows[$object::class][] = $object; }
        }
        public function remove($object, bool $flush = true): void {
            $this->writes++;
            $this->rows[$object::class] = array_values(array_filter($this->rows[$object::class], fn ($o) => $o !== $object));
        }
        public function flush(): void {}
        public function shares(): array {
            return array_map(function (PublicShare $s) {
                $items = array_filter($this->rows[PublicShareItem::class], fn (PublicShareItem $i) => $i->getPublicShare() === $s);
                return [...$s->toArray(), 'items' => array_values(array_map(fn (PublicShareItem $i) => $i->toArray(), $items))];
            }, $this->rows[PublicShare::class]);
        }
    }
}
namespace Pimcore\Bundle\PortalEngineBundle\Model\Configuration\DataPool {
    use Pimcore\Model\Document\Page;

    interface DataPoolConfigInterface {
        public function getId(): int;
        public function getDataPoolName(): string;
        public function getElementType(): string;
        public function getLanguageVariantOrDocument(): Page;
    }
    class StubDataPoolConfig implements DataPoolConfigInterface {
        public function __construct(private Page $document, private string $type, private string $name) {}
        public function getId(): int { return $this->document->getId(); }
        public function getDataPoolName(): string { return $this->name; }
        public function getElementType(): string { return $this->type; }
        public function getLanguageVariantOrDocument(): Page { return $this->document; }
    }
}
namespace Pimcore\Bundle\PortalEngineBundle\Service\DataPool {
    use Pimcore\Model\Site;

    class DataPoolConfigService {
        /** @param array<int, array> $bySite site id => DataPoolConfigInterface[] */
        public function __construct(public array $bySite = []) {}
        public function getDataPoolConfigsFromSite(?Site $site = null, bool $respectLanguageVariants = false) {
            $site = $site ?? Site::getCurrentSite();
            return $this->bySite[$site->getId()] ?? [];
        }
    }
}
namespace Pimcore\Bundle\PortalEngineBundle\Service\PublicShare {
    use Pimcore\Bundle\PortalEngineBundle\Entity\PublicShare;
    use Pimcore\Bundle\PortalEngineBundle\Entity\PublicShareItem;
    use Pimcore\Bundle\PortalEngineBundle\Model\Configuration\DataPool\DataPoolConfigInterface;
    use Pimcore\Bundle\PortalEngineBundle\Service\Entity\EntityManagerService;

    class PublicShareService {
        /** the elements sent to the search index queue, in order */
        public array $indexed = [];
        public function __construct(private EntityManagerService $entities) {}
        // As on the command line: the service reads the logged-in portal user and the current Site, and there are none.
        public function create(string $name, array $downloadConfigs, $expiryDate = null, $showTermsText = false, $termsText = null, $collection = null) {
            throw new \Error('Call to a member function getId() on null (no logged-in portal user)');
        }
        public function getByHash(?string $hash = null) {
            return strlen((string) $hash) === 32 ? $this->entities->getManager()->getRepository(PublicShare::class)->findOneBy(['hash' => $hash]) : null;
        }
        public function getPublicShareItems(PublicShare $publicShare) {
            return $this->entities->getManager()->getRepository(PublicShareItem::class)->findBy(['publicShare' => $publicShare]);
        }
        public function addItemsToPublicShare(PublicShare $publicShare, DataPoolConfigInterface $dataPoolConfig, array $elements) {
            foreach ($elements as $element) {
                $there = $this->entities->getManager()->getRepository(PublicShareItem::class)->findOneBy(
                    ['publicShare' => $publicShare, 'dataPoolId' => $dataPoolConfig->getId(), 'elementId' => $element->getId(), 'elementType' => 'asset']);
                if (!$there) {
                    $this->entities->persist((new PublicShareItem())->setPublicShare($publicShare)->setElementId($element->getId())
                        ->setElementType('asset')->setElementSubType($element->getType())->setDataPoolId($dataPoolConfig->getId()), false);
                }
            }
            $this->entities->flush();
            foreach ($elements as $element) { $this->indexed[] = $element->getId(); }
            return $this;
        }
        public function delete(PublicShare $publicShare) {
            foreach ($this->getPublicShareItems($publicShare) as $item) {
                $this->indexed[] = $item->getElementId();
                $this->entities->remove($item, false);
            }
            $this->entities->remove($publicShare, false);
            $this->entities->flush();
            return $this;
        }
    }
}
