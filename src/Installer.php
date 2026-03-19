<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle;

use Doctrine\DBAL\ArrayParameterType;
use Doctrine\DBAL\Connection;
use Pimcore\Extension\Bundle\Installer\AbstractInstaller;

class Installer extends AbstractInstaller
{
    private const DOCUMENT_TYPE = 'book';

    public function __construct(
        private readonly Connection $db
    ) {
        parent::__construct();
    }

    public function install(): void
    {
        $this->addDocumentEnumType();
    }

    public function uninstall(): void
    {
        // A production implementation should remove the ENUM value from
        // the documents table and clean up any documents of this type.
    }

    public function needsReloadAfterInstall(): bool
    {
        return true;
    }

    private function addDocumentEnumType(): void
    {
        $currentTypes = $this->getCurrentEnumTypes();
        if (!in_array(self::DOCUMENT_TYPE, $currentTypes, true)) {
            $enums = array_merge($currentTypes, [self::DOCUMENT_TYPE]);
            $this->db->executeQuery(
                'ALTER TABLE documents MODIFY COLUMN `type` ENUM(:enums)',
                ['enums' => $enums],
                ['enums' => ArrayParameterType::STRING]
            );
        }
    }

    private function getCurrentEnumTypes(): array
    {
        $result = $this->db->executeQuery("SHOW COLUMNS FROM `documents` LIKE 'type'");
        $typeColumn = $result->fetchAllAssociative();

        if (!empty($typeColumn)) {
            return explode("','", preg_replace("/(enum)\('(.+?)'\)/", '\\2', $typeColumn[0]['Type']));
        }

        return [];
    }
}
