<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Talk;

use Pimcore\Controller\FrontendController;
use Symfony\Component\HttpFoundation\Response;

/**
 * The controller of the demo's footer snippet (F157): the portal's footer it wraps, if any, then the small "Talk"
 * link (templates/portal/footer-snippet.html.twig). Portal Engine has no footer plugin slot; its footer is the snippet
 * the portal configuration names, so coaster-demo:setup makes one of these the portal's footer.
 */
class TalkFooterController extends FrontendController
{
    public function footerAction(): Response
    {
        return $this->render('@PimcoreStudioExampleEnterprise/portal/footer-snippet.html.twig', [
            'document' => $this->document,
            'editmode' => $this->editmode,
        ]);
    }
}
