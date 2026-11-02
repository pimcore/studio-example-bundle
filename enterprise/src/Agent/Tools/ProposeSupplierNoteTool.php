<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Tools;

use Mcp\Capability\Attribute\McpTool;
use Mcp\Capability\Attribute\Schema;
use Mcp\Schema\Result\CallToolResult;
use Mcp\Schema\ToolAnnotations;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\KingdomBriefTools;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\NoPortalUserException;

/**
 * MCP tool `kingdom_propose_supplier_note` of the group `kingdom-portal`: stores a pending Supplier note for the
 * portal user to confirm; it writes no note itself (registered only with PimcoreAgentBundle).
 */
final class ProposeSupplierNoteTool
{
    public const NAME = 'kingdom_propose_supplier_note';

    public function __construct(private readonly KingdomBriefTools $tools)
    {
    }

    #[McpTool(
        name: self::NAME,
        title: 'Propose a Supplier note',
        annotations: new ToolAnnotations(readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false),
        description: 'Propose a Supplier note on a coaster revision the signed-in portal user may view. '
            . 'The note is only stored as a pending proposal; the user confirms it in the portal. Returns the proposal id.'
    )]
    public function execute(
        #[Schema(type: 'integer', description: 'The asset id from kingdom_list_revisions.', minimum: 1)]
        int $assetId,
        #[Schema(type: 'integer', description: 'The revision number from kingdom_list_revisions.', minimum: 1)]
        int $revision,
        #[Schema(type: 'string', description: 'The note text, plain text.', maxLength: KingdomBriefTools::MAX_NOTE_LENGTH)]
        string $text,
    ): CallToolResult {
        try {
            return ToolResult::json($this->tools->proposeSupplierNote($assetId, $revision, $text));
        } catch (NoPortalUserException|\InvalidArgumentException $e) {
            return ToolResult::error($e->getMessage());
        }
    }
}
