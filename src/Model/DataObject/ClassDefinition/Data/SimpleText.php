<?php

declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Model\DataObject\ClassDefinition\Data;

use Pimcore\Model\DataObject;
use Pimcore\Model\Element\ValidationException;
use Pimcore\Model\DataObject\ClassDefinition\Data;
use Pimcore\Model\DataObject\ClassDefinition\Data\EqualComparisonInterface;
use Pimcore\Model\DataObject\ClassDefinition\Data\QueryResourcePersistenceAwareInterface;
use Pimcore\Model\DataObject\ClassDefinition\Data\ResourcePersistenceAwareInterface;
use Pimcore\Model\DataObject\ClassDefinition\Data\TypeDeclarationSupportInterface;
use Pimcore\Model\DataObject\ClassDefinition\Data\VarExporterInterface;
use Pimcore\Model\DataObject\Concrete;
use Pimcore\Normalizer\NormalizerInterface;

class SimpleText extends Data implements
    ResourcePersistenceAwareInterface,
    QueryResourcePersistenceAwareInterface,
    TypeDeclarationSupportInterface,
    EqualComparisonInterface,
    VarExporterInterface,
    NormalizerInterface
{
    use DataObject\ClassDefinition\Data\Extension\Text;
    use DataObject\Traits\DataWidthTrait;
    use DataObject\Traits\SimpleComparisonTrait;
    use DataObject\Traits\DefaultValueTrait;
    use DataObject\Traits\SimpleNormalizerTrait;

    /**
     * @internal
     */
    public ?string $defaultValue = null;

    /**
     * @internal
     */
    public int $columnLength = 190;

    public function getDataForResource(mixed $data, ?Concrete $object = null, array $params = []): ?string
    {
        $data = $this->handleDefaultValue($data, $object, $params);

        return $data;
    }

    public function getDataFromResource(mixed $data, ?DataObject\Concrete $object = null, array $params = []): ?string
    {
        return $data;
    }

    public function getDataForQueryResource(mixed $data, ?DataObject\Concrete $object = null, array $params = []): ?string
    {
        return $this->getDataForResource($data, $object, $params);
    }

    public function getDataForEditmode(mixed $data, ?DataObject\Concrete $object = null, array $params = []): ?string
    {
        return $this->getDataForResource($data, $object, $params);
    }

    public function getDataFromEditmode(mixed $data, ?DataObject\Concrete $object = null, array $params = []): ?string
    {
        if ($data === '') {
            return null;
        }

        return $this->getDataFromResource($data, $object, $params);
    }

    public function getDataFromGridEditor(string $data, ?Concrete $object = null, array $params = []): ?string
    {
        return $this->getDataFromEditmode($data, $object, $params);
    }

    public function getColumnLength(): int
    {
        return $this->columnLength;
    }

    public function setColumnLength(?int $columnLength): static
    {
        if ($columnLength) {
            $this->columnLength = $columnLength;
        }

        return $this;
    }

    public function getColumnType(): string
    {
        return 'varchar(' . $this->getColumnLength() . ')';
    }

    public function getQueryColumnType(): string
    {
        return $this->getColumnType();
    }

    public function checkValidity(mixed $data, bool $omitMandatoryCheck = false, array $params = []): void
    {
        if (is_string($data) && $this->getColumnLength() && mb_strlen($data) > $this->getColumnLength()) {
            throw new ValidationException(
                'Value in field [ ' . $this->getName() . ' ] is longer than ' . $this->getColumnLength() . ' characters'
            );
        }

        parent::checkValidity($data, $omitMandatoryCheck);
    }

    public function synchronizeWithMainDefinition(DataObject\ClassDefinition\Data $mainDefinition): void
    {
        if ($mainDefinition instanceof self) {
            $this->columnLength = $mainDefinition->columnLength;
        }
    }

    public function isFilterable(): bool
    {
        return true;
    }

    protected function doGetDefaultValue(Concrete $object, array $context = []): ?string
    {
        return $this->getDefaultValue();
    }

    public function getDefaultValue(): ?string
    {
        return $this->defaultValue;
    }

    public function setDefaultValue(?string $defaultValue): static
    {
        $this->defaultValue = $defaultValue;

        return $this;
    }

    public function getParameterTypeDeclaration(): ?string
    {
        return '?string';
    }

    public function getReturnTypeDeclaration(): ?string
    {
        return '?string';
    }

    public function getPhpdocInputType(): ?string
    {
        return 'string|null';
    }

    public function getPhpdocReturnType(): ?string
    {
        return 'string|null';
    }

    public function getFieldType(): string
    {
        return 'simpleText';
    }
}
