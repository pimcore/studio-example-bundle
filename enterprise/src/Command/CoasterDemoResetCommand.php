<?php

namespace Pimcore\Bundle\StudioExampleEnterpriseBundle\Command;

use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\CoasterDemo;
use Pimcore\Bundle\StudioExampleEnterpriseBundle\Command\CoasterDemo\ScreamScoreDemo;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Resets Demo 1 between runs: back to revision 1 and the sample scream scores, or with --all to the state before
 * coaster-demo:setup.
 */
#[AsCommand(name: self::NAME, description: 'Resets the coaster demo to revision 1 (--all: removes it)')]
class CoasterDemoResetCommand extends Command
{
    public const NAME = 'coaster-demo:reset';

    public function __construct(
        private readonly CoasterDemo $demo,
        private readonly ScreamScoreDemo $screamScore,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('all', null, InputOption::VALUE_NONE, 'Remove the portal, the supplier, the demo assets and the scream score: the state before setup')
            ->addOption('domain', null, InputOption::VALUE_REQUIRED, 'The portal\'s domain, used if the portal has to be created again', CoasterDemo::DEFAULT_DOMAIN);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $removeAll = (bool) $input->getOption('all');

        $domain = (string) $input->getOption('domain');
        // --all: the ratings and their class before the portal and the coaster folder go; plain: the ratings after the
        // coaster is uploaded again, so the samples point at the new asset
        $changes = $removeAll
            ? [...$this->screamScore->reset(true), ...$this->demo->reset(true, $domain)]
            : [...$this->demo->reset(false, $domain), ...$this->screamScore->reset()];

        if ($removeAll) {
            $changes === [] ? $io->writeln('Nothing to do: the coaster demo is not set up.') : $io->listing($changes);
            $io->success('The coaster demo is removed.');
        } else {
            CoasterDemoSetupCommand::report($io, $changes, 'Nothing to do: the coaster demo is at revision 1.');
            CoasterDemoSetupCommand::reportScreamScore($io, $this->screamScore, $domain);
        }

        return Command::SUCCESS;
    }
}
