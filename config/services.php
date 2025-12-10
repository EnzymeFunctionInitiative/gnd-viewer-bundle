<?php

namespace Symfony\Component\DependencyInjection\Loader\Configurator;

return static function (ContainerConfigurator $container): void {
    $rootDirectory = dirname(__DIR__);
    $container->services()
        ->defaults()
        ->autowire(true)
        ->autoconfigure(true)
        ->load('Efi\\GndViewerBundle\\', $rootDirectory . '/src/')
        ->exclude([
            $rootDirectory . '/src/DepedencyInjection',
            $rootDirectory . '/src/Dto',
            $rootDirectory . '/src/EfiGndViewerBundle.php',
        ]);
//        ->set(Efi\GndViewerBundle\GndViewerService::class)
//        ->autowire()
//        ->autoconfigure();
};
