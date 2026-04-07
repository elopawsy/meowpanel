<?php echo $__env->make('partials/admin.settings.nav', ['activeTab' => 'basic'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>

<?php $__env->startSection('title'); ?>
  Settings
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content-header'); ?>
  <h1>Panel Settings<small>Configure Pterodactyl to your liking.</small></h1>
  <ol class="breadcrumb">
    <li><a href="<?php echo e(route('admin.index')); ?>">Admin</a></li>
    <li class="active">Settings</li>
  </ol>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content'); ?>
  <?php echo $__env->yieldContent('settings::nav'); ?>
  <div class="row">
    <div class="col-xs-12">
      <div class="box">
        <div class="box-header with-border">
          <h3 class="box-title">Panel Settings</h3>
        </div>
        <form action="<?php echo e(route('admin.settings')); ?>" method="POST">
          <div class="box-body">
            <div class="row">
              <div class="form-group col-md-4">
                <label class="control-label">Company Name</label>
                <div>
                  <input type="text" class="form-control" name="app:name"
                    value="<?php echo e(old('app:name', config('app.name'))); ?>" />
                  <p class="text-muted"><small>This is the name that is used throughout the panel and in emails sent to
                      clients.</small></p>
                </div>
              </div>
              <div class="form-group col-md-4">
                <label class="control-label">Require 2-Factor Authentication</label>
                <div>
                  <div class="btn-group" data-toggle="buttons">
                    <?php
                      $level = old('pterodactyl:auth:2fa_required', config('pterodactyl.auth.2fa_required'));
                    ?>
                    <label class="btn btn-outline-primary <?php if($level == 0): ?> active <?php endif; ?>">
                      <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="0" <?php if($level == 0): ?> checked <?php endif; ?>> Not Required
                    </label>
                    <label class="btn btn-outline-primary <?php if($level == 1): ?> active <?php endif; ?>">
                      <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="1" <?php if($level == 1): ?> checked <?php endif; ?>> Admin Only
                    </label>
                    <label class="btn btn-outline-primary <?php if($level == 2): ?> active <?php endif; ?>">
                      <input type="radio" name="pterodactyl:auth:2fa_required" autocomplete="off" value="2" <?php if($level == 2): ?> checked <?php endif; ?>> All Users
                    </label>
                  </div>
                  <p class="text-muted"><small>If enabled, any account falling into the selected grouping will be required
                      to have 2-Factor authentication enabled to use the Panel.</small></p>
                </div>
              </div>
              <div class="form-group col-md-4">
                <label class="control-label">Default Language</label>
                <div>
                  <select name="app:locale" class="form-control">
                    <?php $__currentLoopData = $languages; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $value): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                      <option value="<?php echo e($key); ?>" <?php if(config('app.locale') === $key): ?> selected <?php endif; ?>><?php echo e($value); ?></option>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                  </select>
                  <p class="text-muted"><small>The default language to use when rendering UI components.</small></p>
                </div>
              </div>
            </div>
          </div>
          <div class="box-footer">
            <?php echo csrf_field(); ?>

            <button type="submit" name="_method" value="PATCH"
              class="btn btn-primary btn-sm btn-outline-primary pull-right">Save</button>
          </div>
        </form>
      </div>
    </div>
  </div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /var/www/pyrodactyl/resources/views/admin/settings/index.blade.php ENDPATH**/ ?>