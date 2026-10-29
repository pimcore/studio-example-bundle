<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle;

use Pimcore\Extension\Bundle\AbstractPimcoreBundle;

class PimcoreStudioExampleEnterpriseBundle extends AbstractPimcoreBundle
{
    public function getPath(): string
    {
        return \dirname(__DIR__);
    }
}
