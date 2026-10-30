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
 * Sets up Demo 1 (see README.md next to this file). Idempotent: a second run changes nothing.
 */
#[AsCommand(name: self::NAME, description: 'Sets up the coaster demo: portal, brief, supplier login and revision 1')]
class CoasterDemoSetupCommand extends Command
{
    public const NAME = 'coaster-demo:setup';

    public function __construct(private readonly CoasterDemo $demo)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('domain', null, InputOption::VALUE_REQUIRED, 'The portal\'s domain, used when the portal is created', CoasterDemo::DEFAULT_DOMAIN);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $changes = $this->demo->setup((string) $input->getOption('domain'));
        self::report($io, $changes, 'Nothing to do: the coaster demo is set up already.');

        return Command::SUCCESS;
    }

    /** @param string[] $changes */
    public static function report(SymfonyStyle $io, array $changes, string $nothing): void
    {
        $changes === [] ? $io->writeln($nothing) : $io->listing($changes);
        $io->success(sprintf('Ready. Log in to the portal as %s, password %s.', CoasterDemo::SUPPLIER_EMAIL, CoasterDemo::SUPPLIER_PASSWORD));
    }
}
