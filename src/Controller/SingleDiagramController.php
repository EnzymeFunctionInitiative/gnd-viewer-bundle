<?php

namespace Efi\GndViewerBundle\Controller;

use Efi\Gnd\SingleGndMySqlRetrieval;
use Efi\Gnd\Dto\SingleGndMySqlRetrievalParams;
use Efi\GndViewerBundle\GndViewerService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\Routing\Annotation\Route;

class SingleDiagramController extends AbstractController
{
    public function __construct(
        private readonly GndViewerService $gndService,
    )
    {
    }

    public function index(
        string $id,
        Request $request,
    ): Response
    {
        $params = new SingleGndMySqlRetrievalParams(
            'efidatabase.igb.illinois.edu',
            'efi_202506',
            'efi_dev',
            'vU091#Lg@mszCbpLp#HMHvJScwq3',
        );

        $gnd = new SingleGndMySqlRetrieval($params);

        $results = ['data' => [$gnd->getNeighborhoodData($id)]];

        $viewData = [
            'diagram_stats' => [],
            'diagram_json' => $results,
        ];

        return $this->render('@EfiGndViewer/test_single_gnd.html.twig', $viewData);
    }
}
