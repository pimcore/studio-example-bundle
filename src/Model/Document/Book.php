<?php
declare(strict_types=1);

namespace Pimcore\Bundle\StudioExampleBundle\Model\Document;

use Pimcore\Model\Document\Page;

class Book extends Page
{
    protected string $type = 'book';
}
