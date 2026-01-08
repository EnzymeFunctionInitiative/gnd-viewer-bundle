<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\Dto\GndMetadata;
use Efi\Gnd\Enum\SequenceVersion;
use Efi\GndViewerBundle\Dto\QueryInterface;
use Symfony\Component\HttpFoundation\InputBag;

interface GndViewerInterface
{
    function getSequenceVersion(): SequenceVersion;
    function getMetadata(): GndMetadata;
    function processGndSearch(InputBag $queryStringParams): array;
    function retrieveGndData(InputBag $queryStringParams, string $range): array;
    function getViewerParameters(GndViewerInterface $gndReader, QueryInterface $query, int $jobId, string $jobKey, array $appParams): array;
}
