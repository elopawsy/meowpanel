<?php echo $__env->make('partials/admin.settings.notice', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>

<?php $__env->startSection('settings::nav'); ?>
    <?php echo $__env->yieldContent('settings::notice'); ?>
    <div class="row">
        <div class="col-xs-12">
            <div class="nav-tabs-custom nav-tabs-floating">
                <ul class="nav nav-tabs">
                    <li <?php if($activeTab === 'basic'): ?>class="active"<?php endif; ?>><a href="<?php echo e(route('admin.settings')); ?>">General</a></li>
                    <li <?php if($activeTab === 'mail'): ?>class="active"<?php endif; ?>><a href="<?php echo e(route('admin.settings.mail')); ?>">Mail</a></li>
                    <li <?php if($activeTab === 'captcha'): ?>class="active"<?php endif; ?>><a href="<?php echo e(route('admin.settings.captcha')); ?>">Captcha</a></li>
                    <li <?php if($activeTab === 'domains'): ?>class="active"<?php endif; ?>><a href="<?php echo e(route('admin.settings.domains.index')); ?>">Domains</a></li>
                    <li <?php if($activeTab === 'advanced'): ?>class="active"<?php endif; ?>><a href="<?php echo e(route('admin.settings.advanced')); ?>">Advanced</a></li>
                </ul>
            </div>
        </div>
    </div>
<?php $__env->stopSection(); ?>
<?php /**PATH /var/www/pyrodactyl/resources/views/partials/admin/settings/nav.blade.php ENDPATH**/ ?>