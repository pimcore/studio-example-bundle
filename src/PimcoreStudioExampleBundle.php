<?php

namespace Pimcore\Bundle\StudioExampleBundle;

use Pimcore\Bundle\StudioExampleBundle\DependencyInjection\PimcoreStudioExampleExtension;
use Pimcore\Extension\Bundle\AbstractPimcoreBundle;
use Pimcore\Extension\Bundle\Installer\InstallerInterface;
use Symfony\Component\DependencyInjection\Extension\ExtensionInterface;

class PimcoreStudioExampleBundle extends AbstractPimcoreBundle
{
    public function getPath(): string
    {
        return \dirname(__DIR__);
    }

    /**
     * The extension's alias is `pimcore_studio_example_bundle` (Configuration::ROOT_NODE), not the underscored
     * bundle name Symfony's Bundle::getContainerExtension() insists on, so the extension is created here.
     */
    public function getContainerExtension(): ?ExtensionInterface
    {
        if (null === $this->extension) {
            $this->extension = new PimcoreStudioExampleExtension();
        }

        return $this->extension ?: null;
    }

    public function getInstaller(): InstallerInterface
    {
        return $this->container->get(Installer::class);
    }
}
