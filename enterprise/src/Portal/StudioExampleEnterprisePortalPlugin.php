<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Portal;

use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PortalPluginConfigProviderInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PortalPluginProviderInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\Plugin\PublicSharePluginProviderInterface;
use Pimcore\Bundle\PortalEngineBundle\Service\PublicShare\PublicShareService;
use Symfony\Component\Routing\Exception\ExceptionInterface;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Registers the portal plugin built from assets/portal with Portal Engine. An editor enables it per portal in the
 * portal's "Enabled plugins" field (coaster-demo:setup does it for the demo portal); until assets/portal has been built there is no entrypoints.json, and the portal
 * loads nothing for it.
 *
 * It also runs on a public share's page, for a guest without a portal account (PublicSharePluginProviderInterface).
 * That one opt-in covers everything the plugin adds: the coaster tile and the coaster preview stage with its 3D ride
 * show the guest the coaster, and "Ask the brief" never reaches the guest: it is a header action, a share page has no
 * header slots, and getFrontendConfig() leaves out its config there.
 */
class StudioExampleEnterprisePortalPlugin implements PortalPluginProviderInterface, PortalPluginConfigProviderInterface, PublicSharePluginProviderInterface
{
    // The plugin's id in a portal's "Enabled plugins"; coaster-demo:setup enables it on the demo portal by this id.
    public const ID = 'studio-example-enterprise';

    // The portal's agent chat route (config/pimcore/routing.yaml, src/Portal/Agent/README.md): the panel "Ask the
    // brief" (assets/portal/js/src/agent/README.md) posts to it.
    public const AGENT_CHAT_ROUTE = 'pimcore_studio_example_enterprise_agent_chat';

    public const AGENT_LABEL = 'Ask the brief';

    /**
     * @param bool $agentEnabled the container parameter studio_example_enterprise.agent.enabled (config/portal.yaml,
     *                           default true): false hides the panel's button
     * @param PublicShareService|null $publicShareService tells a public share's page from a portal user's
     */
    public function __construct(
        private readonly UrlGeneratorInterface $urlGenerator,
        private readonly bool $agentEnabled = true,
        private readonly ?PublicShareService $publicShareService = null,
    ) {
    }

    public function getId(): string
    {
        return self::ID;
    }

    public function getLabel(): string
    {
        return 'Studio Example Enterprise';
    }

    /**
     * @return string[]
     */
    public function getEntryPointsJsonLocations(): array
    {
        return [dirname(__DIR__, 2) . '/public/portal/entrypoints.json'];
    }

    public function isAlways(): bool
    {
        return false;
    }

    /** The plugin's parts are safe for a guest: they show the coaster, and the agent stays out (getFrontendConfig()). */
    public function isAvailableForPublicShare(): bool
    {
        return true;
    }

    /**
     * Read by the plugin as config('studio-example-enterprise'): `agent` for the "Ask the brief" button (assets/portal/js/src/agent/AskBriefButton.tsx). Without `agent` there is no button. `mode` says where the answers come from today; the
     * "recorded" badge never depends on it, it comes from the stream. On a public share's page there is no `agent`:
     * the chat is for portal users only (ChatAccess refuses a share's guest), so its URL never reaches a guest.
     *
     * @return array<string, mixed>
     */
    public function getFrontendConfig(): array
    {
        $config = [];
        $agent = $this->getAgentConfig();
        if ($agent !== null) {
            $config['agent'] = $agent;
        }

        return $config;
    }

    /**
     * @return array{chatUrl: string, label: string, mode: string}|null null when disabled or the route is missing
     */
    private function getAgentConfig(): ?array
    {
        if (!$this->agentEnabled || $this->isPublicShare()) {
            return null;
        }
        try {
            $chatUrl = $this->urlGenerator->generate(self::AGENT_CHAT_ROUTE);
        } catch (ExceptionInterface) {
            return null;
        }

        return ['chatUrl' => $chatUrl, 'label' => self::AGENT_LABEL, 'mode' => 'replay'];
    }

    /** Whether this request shows a public share: Portal Engine has set up the share for its page. */
    private function isPublicShare(): bool
    {
        return $this->publicShareService?->getCurrentPublicShare() !== null;
    }
}
