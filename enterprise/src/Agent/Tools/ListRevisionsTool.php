<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Tools;

use Mcp\Capability\Attribute\McpTool;
use Mcp\Schema\Result\CallToolResult;
use Mcp\Schema\ToolAnnotations;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\KingdomBriefTools;

/** MCP tool `kingdom_list_revisions` of the group `kingdom-portal` (registered only with PimcoreAgentBundle). */
final class ListRevisionsTool
{
    public const NAME = 'kingdom_list_revisions';

    public function __construct(private readonly KingdomBriefTools $tools)
    {
    }

    #[McpTool(
        name: self::NAME,
        title: 'List coaster revisions',
        annotations: new ToolAnnotations(readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false),
        description: 'List the .coaster ride design revisions the signed-in portal user may view, with each '
            . 'revision\'s max height and length in metres. Returns an empty list without a portal user.'
    )]
    public function execute(): CallToolResult
    {
        $revisions = $this->tools->listRevisions();

        return ToolResult::json(['revisions' => $revisions, 'count' => count($revisions)]);
    }
}
