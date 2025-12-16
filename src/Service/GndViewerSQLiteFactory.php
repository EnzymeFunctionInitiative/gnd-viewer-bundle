<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\GndReaderSQLite;

class GndViewerSQLiteFactory implements GndViewerFactoryInterface
{
    /**
     * Creates a Reader service for a specific SQLite file on disk.
     */
    public function createViewerForFile(string $filePath): GndViewerInterface
    {
        $this->ensureFileExists($filePath);
        
        // Create a dedicated PDO connection for this specific file
        $dsn = sprintf('sqlite:%s', $filePath);
        $pdo = new \PDO($dsn, null, null, [
            \PDO::ATTR_ERRMODE => \PDO::ERRMODE_EXCEPTION
        ]);

        $gnd = new GndReaderSQLite($pdo);

        return new GndViewerService($gnd);
    }

    private function ensureFileExists(string $path): void
    {
        if (!file_exists($path)) {
            throw new \RuntimeException(sprintf('GND Database file not found at: %s', $path));
        }
    }
}
