<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\Note;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Agent\ProposalStore;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Resets the agent demo between runs: removes the Supplier notes on the demo's fixture assets (no other note) and every
 * pending proposal.
 */
#[AsCommand(name: self::NAME, description: 'Removes the agent demo\'s Supplier notes and pending proposals')]
class ResetCommand extends Command
{
    public const NAME = 'coaster-demo:agent-reset';

    public function __construct(
        private readonly SupplierNoteBackend $notes,
        private readonly ProposalStore $proposals,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $removed = $this->notes->removeSupplierNotes($this->notes->demoAssetIds());
        $this->proposals->removeAll();

        (new SymfonyStyle($input, $output))->success(sprintf('Removed %d Supplier note(s) and the pending proposals.', $removed));

        return Command::SUCCESS;
    }
}
