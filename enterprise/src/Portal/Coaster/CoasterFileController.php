<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal\Coaster;

use Pimcore\Bundle\PortalEngineBundle\Enum\Permission;
use Pimcore\Bundle\PortalEngineBundle\Exception\PublicShareExpiredException;
use Pimcore\Bundle\PortalEngineBundle\Service\DataPool\DataPoolConfigService;
use Pimcore\Bundle\PortalEngineBundle\Service\PublicShare\PublicShareService;
use Pimcore\Bundle\PortalEngineBundle\Service\Security\SecurityService;
use Pimcore\Controller\FrontendController;
use Pimcore\Model\Asset;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Security\Core\Exception\AuthenticationException;

/**
 * The text of a .coaster asset, for the portal's coaster preview stage
 * (assets/portal/js/src/coaster/preview-stage/README.md). The portal's own media stream serves video and audio only,
 * and a portal host does not serve the raw asset path, so the stage reads the file here.
 *
 * Routed by config/pimcore/routing.yaml on portal sites only. Portal Engine checks portal access for every frontend
 * controller on a portal site; this action adds the same checks the portal's preview stream makes: access to the
 * data pool given as `dataPoolId`, VIEW on the asset, and for a public share recipient that the asset is in the share.
 *
 * On a public share's page the 3D ride loads its file here too, with `?publicShareHash=`. Portal Engine logs in a
 * share's guest only on its own routes, so this route is public (PimcoreStudioExampleEnterpriseExtension::prepend())
 * and checks the login itself: a portal user as before (a hash is ignored), else a valid share hash sets up the share's
 * guest, else "invalid login" as before. The route never serves a .coaster file that is not in the guest's share.
 */
class CoasterFileController extends FrontendController
{
    public const ROUTE = 'pimcore_studio_example_enterprise_coaster_file';

    public function __construct(
        private readonly DataPoolConfigService $dataPoolConfigService,
        private readonly PublicShareService $publicShareService,
        private readonly SecurityService $securityService,
    ) {
    }

    public function __invoke(Request $request, int $id): Response
    {
        $this->logInPortalUserOrShareGuest($request);

        $asset = Asset::getById($id);
        // only ride designs: this route must not become a way round the portal's download permission
        if (!$asset instanceof Asset || !self::isCoasterFilename($asset->getFilename())) {
            throw new NotFoundHttpException(sprintf('No .coaster asset with ID %d', $id));
        }

        $this->dataPoolConfigService->setCurrentDataPoolConfigById($request->query->getInt('dataPoolId'));
        $this->denyAccessUnlessGranted(Permission::DATA_POOL_ACCESS);
        $this->denyAccessUnlessGranted(Permission::VIEW, $asset);

        // VIEW passes for every asset of the pool for a share recipient; the share decides (as the preview stream does)
        $user = $this->securityService->getPortalUser();
        if ($user !== null && $user->isPortalShareUser()) {
            $publicShare = $this->publicShareService->getCurrentPublicShare();
            if (!$publicShare || !$this->publicShareService->isElementInPublicShare($publicShare, $asset)) {
                throw new NotFoundHttpException('Element not in PublicShare.');
            }
        }

        return new Response((string) $asset->getData(), Response::HTTP_OK, [
            'Content-Type' => 'application/json; charset=utf-8',
            'Cache-Control' => 'private, no-cache',
        ]);
    }

    /**
     * What Portal Engine does before a portal page, for this public route: a portal login passes, a public share's
     * hash sets up the share's guest (as on the share's own page), anything else is refused with "invalid login".
     *
     * @throws AuthenticationException without a portal login and without a share hash
     * @throws NotFoundHttpException   for an unknown or expired share
     */
    private function logInPortalUserOrShareGuest(Request $request): void
    {
        if ($this->isGranted(Permission::PORTAL_ACCESS)) {
            return;
        }
        $hash = $request->query->getString('publicShareHash');
        if ($hash === '') {
            throw new AuthenticationException('invalid login');
        }
        try {
            $publicShare = $this->publicShareService->validateByHash($hash);
        } catch (PublicShareExpiredException) {
            // the same answer as an unknown share: the 3D ride needs no "expired" page
            throw new NotFoundHttpException('PublicShare not found.');
        }
        $this->publicShareService->setUpPublicShare($publicShare);
    }

    /** Whether the file name is a ride design's: it ends in `.coaster`, in any case. */
    public static function isCoasterFilename(?string $filename): bool
    {
        return $filename !== null && str_ends_with(strtolower($filename), '.coaster');
    }
}
