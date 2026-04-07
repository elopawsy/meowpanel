<?php $__env->startSection('container'); ?>
    <div data-pyro-app id="app"></div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('templates/wrapper', [
    'css' => ['body' => 'bg-black'],
], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /var/www/pyrodactyl/resources/views/templates/base/core.blade.php ENDPATH**/ ?>