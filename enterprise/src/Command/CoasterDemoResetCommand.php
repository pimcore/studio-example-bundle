<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Resets Demo 1 between runs: back to revision 1, or with --all to the state before coaster-demo:setup.
 */
#[AsCommand(name: self::NAME, description: 'Resets the coaster demo to revision 1 (--all: removes it)')]
class CoasterDemoResetCommand extends Command
{
    public const NAME = 'coaster-demo:reset';

    public function __construct(
        private readonly CoasterDemo $demo,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('all', null, InputOption::VALUE_NONE, 'Remove the portal, the supplier and the demo assets: the state before setup')
            ->addOption('domain', null, InputOption::VALUE_REQUIRED, 'The portal\'s domain, used if the portal has to be created again', CoasterDemo::DEFAULT_DOMAIN);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $removeAll = (bool) $input->getOption('all');

        $changes = $this->demo->reset($removeAll, (string) $input->getOption('domain'));

        if ($removeAll) {
            $changes === [] ? $io->writeln('Nothing to do: the coaster demo is not set up.') : $io->listing($changes);
            $io->success('The coaster demo is removed.');
        } else {
            CoasterDemoSetupCommand::report($io, $changes, 'Nothing to do: the coaster demo is at revision 1.');
        }

        return Command::SUCCESS;
    }
}
