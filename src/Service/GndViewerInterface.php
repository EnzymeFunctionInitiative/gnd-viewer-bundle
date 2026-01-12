<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\Dto\GndMetadata;
use Efi\Gnd\Enum\SequenceVersion;
use Efi\GndViewerBundle\Dto\QueryInterface;

interface GndViewerInterface
{
    function getSequenceVersion(): SequenceVersion;
    function getMetadata(): GndMetadata;
    function processGndSearch(QueryInterface $queryStringParams): array;
    function retrieveGndData(QueryInterface $queryStringParams, string $range): array;
    function getViewerParameters(GndViewerInterface $gndReader, QueryInterface $query, int $jobId, string $jobKey, array $appParams): array;
}
