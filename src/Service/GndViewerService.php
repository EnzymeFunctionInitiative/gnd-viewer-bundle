<?php

namespace Efi\GndViewerBundle\Service;

use Efi\Gnd\Dto\GndMetadata;
use Efi\Gnd\Enum\SequenceVersion;
use Efi\Gnd\Interface\GndReaderInterface;
use Efi\GndViewerBundle\Dto\GndRequestParams;
use Efi\GndViewerBundle\Dto\QueryInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

final class GndViewerService implements GndViewerInterface
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
    public function processGndSearch(QueryInterface $queryStringParams): array
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

        if ($dbVersion === SequenceVersion::UniRef50 && ($requestedVersion === SequenceVersion::UniRef50 || $requestedVersion === SequenceVersion::UniRef90 || $requestedVersion === SequenceVersion::UniProt)) {
            return true;
        }

        if ($dbVersion === SequenceVersion::UniRef90 && ($requestedVersion === SequenceVersion::UniRef90 || $requestedVersion === SequenceVersion::UniProt)) {
            return true;
        }

        if ($dbVersion === SequenceVersion::UniProt && $requestedVersion === SequenceVersion::UniProt) {
            return true;
        } 

        return false;
    }

    /**
     * Retrieve a single batch of GNDs (one batch consists of a set of GNDs)
     */
    public function retrieveGndData(QueryInterface $queryStringParams, string $range): array
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

    public function getViewerParameters(GndViewerInterface $gndReader, QueryInterface $query, int $jobId, string $jobKey, array $appParams): array
    {
        $metadata = $gndReader->getMetadata();
        $dbSequenceVersion = $metadata->sequenceVersion->value;
        $searchFirstClusterOnLoad = ($metadata->numClusters === 1 && $metadata->firstClusterNum !== null) ? $metadata->firstClusterNum : null;

        $params = [
            'job_id' => $jobId,
            'job_key' => $jobKey,
            'gnd_batch_size' => $appParams['batch_size'],
            'gnd_set_size' => $appParams['set_size'],
            'gnd_job_name' => $metadata->jobName,
            'gnd_cooccurrence' => $metadata->cooccurrence,
            'gnd_nb_size' => $metadata->neighborhoodSize,
            'base_sequence_version' => $dbSequenceVersion,
            'current_sequence_version' => $query->get('seq-ver') ?? $dbSequenceVersion,
            'uniref_id' => $query->get('uniref-id') ?? '',
            'metadata_url' => $appParams['metadata_url'] ?? '',
            'api_gnd_search' => $appParams['api_gnd_search_url'] ?? '',
            'api_gnd_record' => $appParams['api_gnd_record_url'] ?? '',
            'gnt_home' => $appParams['gnt_home_url'] ?? '',
            'download_db_url' => $appParams['download_db_url'],
        ];

        if ($searchFirstClusterOnLoad !== null) {
            $params['search_cluster_on_load'] = $searchFirstClusterOnLoad;
        }

        return $params;
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
     * @param {QueryInterface} $queryStringParams - raw input query string collection
     * @return {GndRequestParams}
     */
    private function getRequestParams(QueryInterface $queryStringParams): GndRequestParams
    {
        $params = GndRequestParams::fromQueryInterface($queryStringParams);
        return $params;
    }
}
