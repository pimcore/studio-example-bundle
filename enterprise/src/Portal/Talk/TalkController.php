<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Talk;

use Pimcore\Controller\FrontendController;
use Psr\Log\LoggerInterface;
use Symfony\Component\HttpFoundation\Response;

/**
 * The portal page "Talk": the standalone slide viewer in a frame that fills the page, without the portal's header and
 * navigation rail. Routed by config/pimcore/routing.yaml, on portal sites only.
 *
 * When the default viewer is not installed, the page says so instead of framing a 404 (which Portal Engine turns
 * into an error page inside the frame).
 */
class TalkController extends FrontendController
{
    public function __construct(private readonly TalkViewer $viewer, private readonly LoggerInterface $logger)
    {
    }

    public function __invoke(): Response
    {
        $viewerMissing = $this->viewer->isMissing();
        if ($viewerMissing) {
            $this->logger->warning('Talk page: the slide viewer is not installed, {file} does not exist. ' . TalkViewer::INSTALL_STEP, [
                'file' => $this->viewer->defaultViewerFile(),
            ]);
        }

        return $this->render('@PimcoreStudioExampleEnterprise/portal/talk.html.twig', [
            'viewerUrl' => $this->viewer->getUrl(),
            'viewerMissing' => $viewerMissing,
            'installStep' => TalkViewer::INSTALL_STEP,
            // not a document of its own: without it the layout would title the page after the portal's start page
            'pageTitleOverride' => TalkPage::LABEL,
        ]);
    }
}
