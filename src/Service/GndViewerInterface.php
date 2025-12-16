<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\Dto\GndMetadata;
use Efi\Gnd\Enum\SequenceVersion;
use Symfony\Component\HttpFoundation\InputBag;

interface GndViewerInterface
{
    function getSequenceVersion(): SequenceVersion;
    function getMetadata(): GndMetadata;
    function processGndSearch(InputBag $queryStringParams): array;
    function retrieveGndData(InputBag $queryStringParams, string $range): array;
}
