<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Dashboards\Repository;

use Exception;
use Pimcore\Bundle\StudioBackendBundle\Exception\Api\ElementSavingFailedException;
use Pimcore\Bundle\StudioBackendBundle\Exception\Api\NotWriteableException;
use Pimcore\Bundle\StudioBackendBundle\Exception\Api\ValidationFailedException;
use Pimcore\Bundle\StudioBackendBundle\Icon\Service\IconServiceInterface;
use Pimcore\Bundle\StudioBackendBundle\Util\Constant\UserPermissions;
use Pimcore\Bundle\StudioDashboardsBundle\Repository\Widget\AbstractConfigRepository;
use Pimcore\Bundle\StudioDashboardsBundle\Schema\Widget\SaveWidgetConfig;
use Pimcore\Bundle\StudioDashboardsBundle\Service\Loader\Widget\TaggedIteratorRepository;
use Pimcore\Bundle\StudioDashboardsBundle\Util\Constant\VisualizationOptions;
use Pimcore\Bundle\StudioExampleBundle\Dashboards\Schema\SaveTopAssetsWidgetConfig;
use Pimcore\Bundle\StudioExampleBundle\DependencyInjection\Configuration;
use Pimcore\Config\LocationAwareConfigRepository;
use Symfony\Component\DependencyInjection\Attribute\AutoconfigureTag;
use Symfony\Component\Serializer\Exception\ExceptionInterface;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Throwable;
use function sprintf;

/**
 * Stores and loads the configuration of `top_assets` widgets.
 *
 * The widget configurations of an external bundle are persisted under the bundle's own
 * extension root node ("pimcore_studio_example_bundle"), so saveConfigData() is overridden
 * to nest the YAML accordingly (the parent class nests under the dashboards root node,
 * which only works for the built-in widget types).
 */
#[AutoconfigureTag(TaggedIteratorRepository::REPOSITORY_TAG)]
final class TopAssetsConfigRepository extends AbstractConfigRepository
{
    private ?LocationAwareConfigRepository $repository = null;

    public function __construct(
        private readonly IconServiceInterface $iconService,
        private readonly NormalizerInterface $normalizer,
        private readonly array $widgetConfigurations,
        private readonly array $storageConfig,
    ) {
        parent::__construct($this->normalizer);
    }

    public function getSupportedWidgetType(): string
    {
        return 'top_assets';
    }

    public function getVisualizationOptions(): array
    {
        return [VisualizationOptions::TABLE->value];
    }

    /**
     * @throws ElementSavingFailedException|NotWriteableException|ValidationFailedException
     */
    public function createConfiguration(array $widgetData): string
    {
        $config = $this->validateData($widgetData);
        $this->saveConfigData($config);

        return $config->getId();
    }

    protected function getWidgetNode(): string
    {
        return Configuration::TOP_ASSETS_WIDGETS_NODE;
    }

    protected function getPermissions(): array
    {
        return [UserPermissions::ASSETS->value];
    }

    protected function getRepository(): LocationAwareConfigRepository
    {
        if (!$this->repository) {
            $this->repository = new LocationAwareConfigRepository(
                $this->widgetConfigurations,
                Configuration::ROOT_NODE . '_' . $this->getWidgetNode(),
                $this->storageConfig
            );
        }

        return $this->repository;
    }

    /**
     * @throws ValidationFailedException
     */
    protected function validateData(array $widgetData): SaveTopAssetsWidgetConfig
    {
        try {
            return new SaveTopAssetsWidgetConfig(
                $widgetData['id'],
                $widgetData['name'],
                empty($widgetData['icon']) ? null : $this->iconService->getIconForValue($widgetData['icon']),
                (int) ($widgetData['limit'] ?? 10),
                $widgetData['color'],
                $widgetData['visualization'] ?? VisualizationOptions::TABLE->value,
            );
        } catch (Throwable $exception) {
            throw new ValidationFailedException(
                sprintf('Could not process data: %s', $exception->getMessage()),
                previous: $exception
            );
        }
    }

    /**
     * @throws ElementSavingFailedException|NotWriteableException
     */
    protected function saveConfigData(SaveWidgetConfig $widgetConfiguration): void
    {
        try {
            $widgetData = $this->normalizer->normalize($widgetConfiguration);
        } catch (Exception|ExceptionInterface $exception) {
            throw new ElementSavingFailedException(null, $exception->getMessage());
        }

        $this->isRepositoryWritable(message: 'Could not save the widget configuration: %s');

        try {
            $this->getRepository()->saveConfig(
                $widgetConfiguration->getId(),
                $widgetData,
                fn (string $key, array $data): array => [
                    Configuration::ROOT_NODE => [
                        $this->getWidgetNode() => [
                            $key => $data,
                        ],
                    ],
                ]
            );
        } catch (Exception $exception) {
            throw new ElementSavingFailedException(null, $exception->getMessage());
        }
    }
}
