<?php

namespace Efi\GndViewerBundle\Service;

use PDO;
use PDOException;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class DatabaseService
{
    private ?PDO $pdo = null;

    public function __construct(
        #[Autowire('%app.database_user%')] private string $dbUser,
        #[Autowire('%app.database_password%')] private string $dbPassword,
        #[Autowire('%app.database_host%')] private string $dbHost,
        #[Autowire('%app.database_name%')] private string $dbName,
        private readonly LoggerInterface $logger,
    )
    {
    }

    public function getConnection(): PDO
    {
        // Use a lazy connection: only connect if we haven't already.
        if ($this->pdo === null) {
            $dsn = "mysql:host={$this->dbHost};dbname={$this->dbName}";
            try {
                $this->pdo = new PDO($dsn, $this->dbUser, $this->dbPassword);
                $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } catch (PDOException $e) {
                $this->logger->error('Database connection error: ' . $e->getMessage());
                throw new \RuntimeException('Database connection error: ' . $e->getMessage());
            }
        }

        return $this->pdo;
    }
}
