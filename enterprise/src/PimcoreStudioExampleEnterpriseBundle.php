<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\DependencyInjection\Compiler\WysiwygFigurePass;
use Pimcore\Extension\Bundle\AbstractPimcoreBundle;
use Symfony\Component\DependencyInjection\ContainerBuilder;

class PimcoreStudioExampleEnterpriseBundle extends AbstractPimcoreBundle
{
    public function getPath(): string
    {
        return \dirname(__DIR__);
    }

    public function build(ContainerBuilder $container): void
    {
        parent::build($container);
        // the content pages' pictures (F160): Pimcore's wysiwyg sanitizer keeps <figure>, <figcaption> and the img's size
        $container->addCompilerPass(new WysiwygFigurePass());
    }
}
