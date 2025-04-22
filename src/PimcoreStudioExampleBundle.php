<?php

namespace Pimcore\Bundle\StudioExampleBundle;

use Pimcore\Extension\Bundle\AbstractPimcoreBundle;

class PimcoreStudioExampleBundle extends AbstractPimcoreBundle
{
    public function getPath(): string
    {
        return \dirname(__DIR__);
    }
}
