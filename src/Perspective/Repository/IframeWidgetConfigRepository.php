<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Perspective\Repository;

use Exception;
use Pimcore\Bundle\StudioBackendBundle\Exception\Api\ElementSavingFailedException;
use Pimcore\Bundle\StudioBackendBundle\Exception\Api\NotFoundException;
use Pimcore\Bundle\StudioBackendBundle\Exception\Api\NotWriteableException;
use Pimcore\Bundle\StudioBackendBundle\Perspective\Repository\WidgetConfigRepositoryInterface;
use Pimcore\Config\LocationAwareConfigRepository;
use function sprintf;

final class IframeWidgetConfigRepository implements WidgetConfigRepositoryInterface
{
    private const string STORAGE_SCOPE = 'example_iframe_widgets';

    private ?LocationAwareConfigRepository $repository = null;

    public function getSupportedWidgetType(): string
    {
        return 'example_iframe';
    }

    public function isWidgetTypeOnlyWrapper(): bool
    {
        return false;
    }

    /**
     * @throws ElementSavingFailedException
     */
    public function createConfiguration(array $widgetData): string
    {
        $configData = [
            'name' => $widgetData['name'] ?? 'New Iframe Widget',
            'icon' => $widgetData['icon'] ?? null,
            'url' => $widgetData['url'] ?? '',
            'height' => $widgetData['height'] ?? null,
        ];

        $this->saveConfigData($widgetData['id'], $configData);

        return $widgetData['id'];
    }

    /**
     * @throws ElementSavingFailedException
     */
    public function updateConfiguration(array $widgetData): void
    {
        $configData = [
            'name' => $widgetData['name'],
            'icon' => $widgetData['icon'] ?? null,
            'url' => $widgetData['url'] ?? '',
            'height' => $widgetData['height'] ?? null,
        ];

        $this->saveConfigData($widgetData['id'], $configData);
    }

    /**
     * @throws NotFoundException
     */
    public function getConfiguration(string $widgetId): array
    {
        [$configData] = $this->loadConfig($widgetId);
        $configData['isWriteable'] = true;
        $configData['id'] = $widgetId;

        return $configData;
    }

    public function listConfigurations(): array
    {
        $configurations = [];
        foreach ($this->getRepository()->fetchAllKeys() as $key) {
            try {
                $configurations[] = $this->getConfiguration($key);
            } catch (NotFoundException) {
                // skip invalid configs
            }
        }

        return $configurations;
    }

    /**
     * @throws NotWriteableException
     */
    public function deleteConfiguration(string $widgetId): void
    {
        $this->loadConfig($widgetId);

        try {
            $this->getRepository()->deleteData(
                $widgetId,
                LocationAwareConfigRepository::LOCATION_SETTINGS_STORE
            );
        } catch (Exception $exception) {
            throw new NotWriteableException(
                'widget',
                sprintf(
                    'Widget configuration (%s) could not be deleted: %s',
                    $widgetId,
                    $exception->getMessage()
                ),
                $exception
            );
        }
    }

    /**
     * @throws ElementSavingFailedException
     */
    private function saveConfigData(string $id, array $configData): void
    {
        try {
            $this->getRepository()->saveConfig(
                $id,
                $configData,
                function (string $_key, array $data) {
                    return $data;
                }
            );
        } catch (Exception $exception) {
            throw new ElementSavingFailedException(
                null,
                $exception->getMessage()
            );
        }
    }

    private function getRepository(): LocationAwareConfigRepository
    {
        if (!$this->repository) {
            $this->repository = new LocationAwareConfigRepository(
                [],
                self::STORAGE_SCOPE,
                [
                    'write_target' => [
                        'type' => LocationAwareConfigRepository::LOCATION_SETTINGS_STORE,
                        'options' => [
                            'directory' => '',
                        ],
                    ],
                ]
            );
        }

        return $this->repository;
    }

    /**
     * @throws NotFoundException
     */
    private function loadConfig(string $widgetId): array
    {
        $data = $this->getRepository()->loadConfigByKey($widgetId);
        if ($data[0] === null) {
            throw new NotFoundException(
                'widget',
                sprintf(
                    '[ID: %s, Type: %s]',
                    $widgetId,
                    $this->getSupportedWidgetType()
                ),
                'ID and Type'
            );
        }

        return $data;
    }
}
