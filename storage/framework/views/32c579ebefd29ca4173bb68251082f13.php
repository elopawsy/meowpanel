<!DOCTYPE html>
<!-- Copyright (c) 2023-2025 Pyro Inc., parent collaborators, and contributors -->
<html data-pyro-html lang="en" style="background-color: #000000; height: 100%; width: 100%; margin: 0; padding: 0;">
    <head>
        <title><?php echo e(config('app.name', 'Panel')); ?></title>

        <?php $__env->startSection('meta'); ?>
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
            <meta name="csrf-token" content="<?php echo e(csrf_token()); ?>">
            <meta name="robots" content="noindex">

            <link rel="icon" type="image/png" href="/favicons/favicon-96x96.png" sizes="96x96" />
            <link rel="icon" type="image/svg+xml" href="/favicons/favicon.svg" />
            <link rel="shortcut icon" href="/favicons/favicon.ico" />
            <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png" />
            <meta name="apple-mobile-web-app-title" content="Meowpanel" />
            <link rel="manifest" href="/favicons/site.webmanifest" />

            <meta name="theme-color" content="#000000">
            <meta name="darkreader-lock">
        <?php echo $__env->yieldSection(); ?>

        <?php $__env->startSection('user-data'); ?>
            <?php if(!is_null(Auth::user())): ?>
                <script>
                    window.PterodactylUser = <?php echo json_encode(Auth::user()->toVueObject()); ?>;
                </script>
            <?php endif; ?>
            <?php if(!empty($siteConfiguration)): ?>
                <script>
                    window.SiteConfiguration = <?php echo json_encode($siteConfiguration); ?>;
                </script>
            <?php endif; ?>
        <?php echo $__env->yieldSection(); ?>
        <style>
            @import url('https://fonts.bunny.net/css2?family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap')
        </style>

        <?php echo $__env->yieldContent('assets'); ?>

        <?php echo $__env->make('layouts.scripts', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>

        <?php echo app('Illuminate\Foundation\Vite')->reactRefresh(); ?>
        <?php echo app('Illuminate\Foundation\Vite')('resources/scripts/index.tsx'); ?>
    </head>
    <body data-pyro-body class="<?php echo e($css['body']); ?>" style="background-color: #000000; height: 100%; width: 100%; margin: 0; padding: 0;">
        <?php $__env->startSection('content'); ?>
            <?php echo $__env->yieldContent('above-container'); ?>
            <?php echo $__env->yieldContent('container'); ?>
            <?php echo $__env->yieldContent('below-container'); ?>
        <?php echo $__env->yieldSection(); ?>
    </body>
</html>
<?php /**PATH /var/www/pyrodactyl/resources/views/templates/wrapper.blade.php ENDPATH**/ ?>