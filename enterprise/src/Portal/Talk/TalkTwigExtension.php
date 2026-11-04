<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Talk;

use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * studioExampleEnterprise_talk(): the URL and label of the portal page "Talk" for the footer link
 * (templates/portal/footer-talk.html.twig), or null outside a portal. The same TalkPage the portal plugin's frontend
 * config hands over, so Twig and the browser get one URL.
 */
class TalkTwigExtension extends AbstractExtension
{
    public function __construct(private readonly TalkPage $talkPage)
    {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('studioExampleEnterprise_talk', fn (): ?array => $this->talkPage->getNavEntry()),
        ];
    }
}
