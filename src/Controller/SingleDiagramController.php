<?php

namespace Efi\GndViewerBundle\Controller;

use Efi\Gnd\SingleGndMySqlRetrieval;
use Efi\GndViewerBundle\Service\DatabaseService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\Routing\Annotation\Route;

class SingleDiagramController extends AbstractController
{
    public function __construct(
        private readonly DatabaseService $databaseService,
    )
    {
    }

    public function index(
        string $id,
        Request $request,
    ): Response
    {
        $gnd = new SingleGndMySqlRetrieval($this->databaseService->getConnection());

        $results = ['data' => [$gnd->getNeighborhoodData($id)]];

        $viewData = [
            'diagram_stats' => [],
            'diagram_json' => $results,
        ];

        return $this->render('@EfiGndViewer/single_gnd_fragment.html.twig', $viewData);
    }
}
