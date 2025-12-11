<?php

namespace Efi\GndViewerBundle\Controller;

use Efi\Gnd\Interface\GndDatabaseServiceInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Symfony\Component\Routing\Annotation\Route;

class SingleDiagramController extends AbstractController
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly GndDatabaseServiceInterface $databaseService,
    )
    {
    }

    public function index(
        string $id,
        ?int $windowSize,
    ): Response
    {
        if (!$windowSize)
            $windowSize = \Efi\Gnd\Util\GndConstants::DEFAULT_WINDOW_SIZE;

        $data = $this->databaseService->getNeighborhoodData($id, $windowSize);
        $results = ['data' => [$data]];

        $viewData = [
            'diagram_stats' => [],
            'diagram_json' => $results,
        ];

        return $this->render('@EfiGndViewer/single_gnd_fragment.html.twig', $viewData);
    }
}
