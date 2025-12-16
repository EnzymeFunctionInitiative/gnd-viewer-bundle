<?php

namespace Efi\GndViewerBundle;

use Efi\Gnd\SingleGndMySQLRetrieval;
use Efi\Gnd\SingleGndSQLiteRetrieval;
use Efi\Gnd\Interface\SingleGndServiceInterface;
use Efi\GndViewerBundle\Controller\SingleDiagramController;
use Efi\GndViewerBundle\Service\GndViewerMySQLFactory;
use Efi\GndViewerBundle\Service\GndViewerSQLiteFactory;
use Symfony\Component\AssetMapper\AssetMapperInterface;
use Symfony\Component\Config\Definition\Configurator\DefinitionConfigurator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;
use Symfony\Component\DependencyInjection\Loader\Configurator\ContainerConfigurator;
use Symfony\Component\HttpKernel\Bundle\AbstractBundle;

class EfiGndViewerBundle extends AbstractBundle
{
    public function configure(DefinitionConfigurator $definition): void
    {
        $definition->rootNode()
            ->children()
                ->arrayNode('single_gnd')
                    ->canBeEnabled()
                    ->children()
                        ->enumNode('driver')->values(['mysql', 'sqlite'])->isRequired()->end()
                        ->scalarNode('pdo')->isRequired()->info('The Service ID of the PDO connection')->end()
                    ->end()
                ->end()
                ->arrayNode('gnd_reader_service')
                    ->canBeEnabled()
                    ->children()
                        ->enumNode('driver')->values(['mysql', 'sqlite'])->isRequired()->end()
                        ->scalarNode('pdo')->isRequired()->info('The Service ID of the PDO connection')->end()
                    ->end()
                ->end()
                ->arrayNode('gnd_viewer_service')
                    ->canBeEnabled()
                    ->children()
                        ->enumNode('driver')->values(['sqlite'])->isRequired()->end()
                    ->end()
                ->end()
            ->end();
    }

    public function loadExtension(array $config, ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        if ($config['single_gnd']['enabled'] === true) {
            $serviceConfig = $config['single_gnd'];

            $class = match ($serviceConfig['driver']) {
                'mysql' => SingleGndMySQLRetrieval::class,
                'sqlite' => SingleGndSQLiteRetrieval::class,
            };

            $container->services()
                ->set('efi_gnd_viewer.single_gnd', $class)
                    ->args([
                        new Reference($serviceConfig['pdo']),
                    ])
                    ->alias(SingleGndServiceInterface::class, 'efi_gnd_viewer.single_gnd');

            $container->services()
                ->set(SingleDiagramController::class)
                    ->autowire(true)      // Injects Logger & SingleGndServiceInterface
                    ->autoconfigure(true) // Helper tags
                    ->tag('controller.service_arguments'); // REQUIRED for use in {{ render(controller(...)) }}
        }

        $container->services()
            ->set(GndViewerSQLiteFactory::class)
            ->autowire(true)
            ->autoconfigure(true)
            ->public(); // Optional, but helps if debugging

        $container->services()
            ->set(GndViewerMySQLFactory::class)
            ->autowire(true)
            ->autoconfigure(true)
            ->public();

        //if ($config['gnd_viewer']['enabled'] === true) {
        //    $serviceConfig = $config['gnd_viewer'];

        //    $class = match ($serviceConfig['driver']) {
        //        'mysql' => GndReaderMySQL::class,
        //        'sqlite' => GndReaderSQLite::class,
        //    };

        //    $container->services()
        //        ->set('efi_gnd_viewer.gnd_viewer', $class)
        //        ->args([
        //            new Reference($serviceConfig['pdo']),
        //        ])
        //        ->alias(GndReaderInterface::class, 'efi_gnd_viewer.gnd_viewer');
        //}

        //if ($config['gnd_viewer_service']['enabled'] === true) {
        //    $serviceConifg = $config['gnd_viewer_service'];

        //    $class = match ($serviceConfig['driver']) {
        //        'sqlite' => GndViewerSQLiteFactory::class,
        //    };

        //    $container->services()
        //        ->set('efi_gnd_viewer.gnd_viewer_service', $class)
        //        ->alias(GndViewerFactoryInterface::class, 'efi_gnd_viewer.gnd_viewer_service');
        //}

        //$container->services()
        //    ->set(GndReaderFactory::class)
        //        ->autoconfigure(true)
        //        ->autowire(true)
        //        ->public();
    }

    public function prependExtension(ContainerConfigurator $container, ContainerBuilder $builder): void
    {
        if (!interface_exists(AssetMapperInterface::class)) {
            return;
        }

        $builder->prependExtensionConfig('framework', [
            'asset_mapper' => [
                'paths' => [
                    // This maps the "assets/" folder to the namespace "@efi/gnd-viewer-bundle"
                    __DIR__ . '/../assets' => '@efi/gnd-viewer-bundle',
                ],
            ],
        ]);
    }
}
