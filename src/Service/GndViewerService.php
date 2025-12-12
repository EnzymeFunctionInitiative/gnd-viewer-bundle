<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\Dto\GndMetadata;
use Efi\Gnd\Dto\GndQueryParams;
use Efi\Gnd\Enum\SequenceVersion;
use Efi\Gnd\Interface\GndReaderInterface;
use Efi\GndViewerBundle\Dto\GndRequestParams;
use Symfony\Component\HttpFoundation\InputBag;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;

final class GndViewerService
{
    public function __construct(
        private readonly ?GndReaderInterface $gndReader,
    )
	{
    }

    public function getSequenceVersion(): SequenceVersion
    {
        return $this->gndReader->getSequenceVersion();
    }

    /**
     * Returns GND metadata such as job name, cooccurrence, neighborhood size and sequence version.
     * @return {array} array of string key-values
     */
    public function getMetadata(): GndMetadata
    {
        $metadata = $this->gndReader->getMetadata();
        return $metadata;
    }

    /**
     * Initial call for search query to obtain stats on the cluster/query, such as the range of
     * indices to retrieve and width in terms of base pairs, etc.
     */
    public function processGndSearch(InputBag $queryStringParams): array
    {
        $params = $this->getRequestParams($queryStringParams);

        if ($params->unirefId) {
            $searchItems = [$params->unirefId];
        } else {
            $searchItems = $this->processQuery($params->rawQuery);
        }

        $results = [
            'query' => $searchItems,
        ];

        if (count($searchItems) == 0) {
            return $results;
        }

        $searchExtent = $this->gndReader->getSearchExtent($searchItems, $params->toGndQueryParams());

        $results['extent'] = $searchExtent;

        if ($params->sequenceVersion) {
            if (!$this->validateSequenceVersion($params->sequenceVersion)) {
                throw new NotFoundHttpException('Invalid parameters (errno 3).');
            }
        }

        if ($params->sequenceVersion === SequenceVersion::UniRef90 || $params->sequenceVersion === SequenceVersion::UniRef50) {
            $results['uniref_version'] = $params->sequenceVersion->value;
        }

        return $results;
    }

    private function validateSequenceVersion(SequenceVersion $requestedVersion): bool
    {
        $dbVersion = $this->gndReader->getMetadata()->sequenceVersion;

        if ($requestedVersion === SequenceVersion::UniRef50 && $dbVersion === SequenceVersion::UniRef50) {
            return true;
        }

        if ($requestedVersion === SequenceVersion::UniRef90 && ($dbVersion === SequenceVersion::UniRef50 || $dbVersion === SequenceVersion::UniRef90)) {
            return true;
        }

        return false;
    }

    /**
     * Retrieve a single batch of GNDs (one batch consists of a set of GNDs)
     */
    public function retrieveGndData(InputBag $queryStringParams, string $range): array
    {
        $params = $this->getRequestParams($queryStringParams);

        if ($params->sequenceVersion) {
            if (!$this->validateSequenceVersion($params->sequenceVersion)) {
                throw new NotFoundHttpException('Invalid parameters (errno 3).');
            }
        }

        $results = $this->gndReader->retrieveRanges($range, $params->toGndQueryParams());

        return $results;
    }

    /**
     * Process a raw GND input search string.
     *
     * Process a raw GND input search string by sanitizing it, removing spaces, and splitting into
     * individual query items.
     *
     * @param {string} $rawQuery - the raw query (e.g. "1\n2\n3")
     * @return {array} array of strings - (e.g. ["1", "2", "3"])
     */
    private function processQuery(string $rawQuery): array
    {
        $query = trim(strtoupper($rawQuery));
        $queryParts = preg_split('/[\n\r ,]+/', $query);
        $filteredParts = array_filter($queryParts, fn($item) => preg_match('/^[A-Z0-9\.\-_]+$/', $item));
        return $filteredParts;
    }

    /**
     * Retrieve the query string parameters from the HTTP request object into an array.
     * @param {InputBag} $queryStringParams - raw input query string collection
     * @return {GndRequestParams}
     */
    private function getRequestParams(InputBag $queryStringParams): GndRequestParams
    {
        $params = new GndRequestParams($queryStringParams);
        return $params;
    }
}
