<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\GndReaderSQLite;
use Efi\Gnd\Interface\GndReaderInterface;

class GndReaderFactory
{
    /**
     * Creates a Reader service for a specific SQLite file on disk.
     */
    public function createReaderForFile(string $filePath): GndReaderInterface
    {
        $this->ensureFileExists($filePath);
        
        // Create a dedicated PDO connection for this specific file
        $dsn = sprintf('sqlite:%s', $filePath);
        $pdo = new \PDO($dsn, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
        ]);

        return new GndReaderSQLite($pdo);
    }

    private function ensureFileExists(string $path): void
    {
        if (!file_exists($path)) {
            throw new \RuntimeException(sprintf('GND Database file not found at: %s', $path));
        }
    }
}
