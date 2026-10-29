<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Talk;

use Pimcore\Controller\FrontendController;
use Symfony\Component\HttpFoundation\Response;

/**
 * The portal page "Talk": the standalone slide viewer in a frame that fills the page, without the portal's header and
 * navigation rail. Routed by config/pimcore/routing.yaml, on portal sites only.
 */
class TalkController extends FrontendController
{
    public function __construct(private readonly string $viewerUrl)
    {
    }

    public function __invoke(): Response
    {
        return $this->render('@PimcoreStudioExampleEnterprise/portal/talk.html.twig', [
            'viewerUrl' => $this->viewerUrl,
            // not a document of its own: without it the layout would title the page after the portal's start page
            'pageTitleOverride' => TalkPage::LABEL,
        ]);
    }
}
