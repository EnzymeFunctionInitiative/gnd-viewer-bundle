<?php

namespace Efi\GndViewerBundle\Service;

use Efi\GndViewerBundle\Service\GndViewer;
use Efi\GndViewerBundle\Service\GndViewerInterface;
use Efi\Gnd\Reader\GndReaderMySQL;

class GndViewerMySQLFactory
{
    public function create(\PDO $pdo): GndViewerInterface
    {
        // 1. Create the low-level Reader
        $reader = new GndReaderMySQL($pdo);

        // 2. Wrap it in the high-level Viewer
        return new GndViewerService($reader);
    }
}
