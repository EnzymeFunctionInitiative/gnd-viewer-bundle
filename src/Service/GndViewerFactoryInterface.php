<?php

namespace Efi\GndViewerBundle\Service;

interface GndViewerFactoryInterface
{
    function createViewerForFile(string $filePath): GndViewerInterface;
}
