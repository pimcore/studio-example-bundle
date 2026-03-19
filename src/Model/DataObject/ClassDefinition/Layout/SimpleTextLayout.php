<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Model\DataObject\ClassDefinition\Layout;

use Pimcore\Model\DataObject\ClassDefinition\Layout;

class SimpleTextLayout extends Layout
{
    public string $fieldtype = 'simpleTextLayout';

    public string $html = '';

    public function getHtml(): string
    {
        return $this->html;
    }

    public function setHtml(string $html): static
    {
        $this->html = $html;

        return $this;
    }
}
