<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Tools;

use Mcp\Capability\Attribute\McpTool;
use Mcp\Schema\Result\CallToolResult;
use Mcp\Schema\ToolAnnotations;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\KingdomBriefTools;

/** MCP tool `kingdom_read_brief` of the group `kingdom-portal` (registered only with PimcoreAgentBundle, see README). */
final class ReadBriefTool
{
    public const NAME = 'kingdom_read_brief';

    public function __construct(private readonly KingdomBriefTools $tools)
    {
    }

    #[McpTool(
        name: self::NAME,
        title: 'Read the Thunder Loop brief',
        annotations: new ToolAnnotations(readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false),
        description: 'Read the Pimcore Kingdom brief for the Thunder Loop coaster, as the signed-in portal user sees it. '
            . 'Returns the brief as plain text. Without a portal user it returns an error and no text.'
    )]
    public function execute(): CallToolResult
    {
        $brief = $this->tools->readBrief();

        return $brief === null
            ? ToolResult::error('No brief for this caller: only a signed-in portal user may read it.')
            : ToolResult::json(['brief' => $brief]);
    }
}
