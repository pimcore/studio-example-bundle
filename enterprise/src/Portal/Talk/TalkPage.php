<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Talk;

use Symfony\Component\Routing\Exception\ExceptionInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * The URL of the portal page "Talk", generated on the server: the portal's prefix lives on the router context, and
 * the browser cannot derive it from the current path.
 */
class TalkPage
{
    public const ROUTE = 'pimcore_studio_example_enterprise_talk';

    public const LABEL = 'Talk';

    public function __construct(private readonly UrlGeneratorInterface $urlGenerator)
    {
    }

    /**
     * @return array{url: string, label: string}|null null outside a portal, where the route has no prefix
     */
    public function getNavEntry(): ?array
    {
        try {
            return ['url' => $this->urlGenerator->generate(self::ROUTE), 'label' => self::LABEL];
        } catch (ExceptionInterface) {
            return null;
        }
    }
}
