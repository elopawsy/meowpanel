<?php echo $__env->make('partials/admin.settings.nav', ['activeTab' => 'domains'], array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?>

<?php $__env->startSection('title'); ?>
  Domain Management
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content-header'); ?>
  <h1>Domain Management<small>Configure DNS domains for subdomain management.</small></h1>
  <ol class="breadcrumb">
    <li><a href="<?php echo e(route('admin.index')); ?>">Admin</a></li>
    <li><a href="<?php echo e(route('admin.settings')); ?>">Settings</a></li>
    <li class="active">Domains</li>
  </ol>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content'); ?>
  <?php echo $__env->yieldContent('settings::nav'); ?>
  <div class="row">
    <div class="col-xs-12">
      <div class="box">
        <div class="box-header with-border">
          <h3 class="box-title">Configured Domains</h3>
          <div class="box-tools">
            <a href="<?php echo e(route('admin.settings.domains.create')); ?>" class="btn btn-sm btn-primary">Create New Domain</a>
          </div>
        </div>
        <div class="box-body table-responsive no-padding">
          <?php if(count($domains) > 0): ?>
            <table class="table table-hover">
              <thead>
                <tr>
                  <th>Domain Name</th>
                  <th>DNS Provider</th>
                  <th>Status</th>
                  <th>Default</th>
                  <th>Subdomains</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <?php $__currentLoopData = $domains; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $domain): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                  <tr>
                    <td><code><?php echo e($domain->name); ?></code></td>
                    <td>
                      <span class="label label-primary"><?php echo e(ucfirst($domain->dns_provider)); ?></span>
                    </td>
                    <td>
                      <?php if($domain->is_active): ?>
                        <span class="label label-success">Active</span>
                      <?php else: ?>
                        <span class="label label-danger">Inactive</span>
                      <?php endif; ?>
                    </td>
                    <td>
                      <?php if($domain->is_default): ?>
                        <span class="label label-info">Default</span>
                      <?php endif; ?>
                    </td>
                    <td>
                      <span class="label label-default"><?php echo e($domain->server_subdomains_count ?? 0); ?></span>
                    </td>
                    <td><?php echo e($domain->created_at->diffForHumans()); ?></td>
                    <td class="text-center">
                      <a href="<?php echo e(route('admin.settings.domains.edit', $domain)); ?>" class="btn btn-xs btn-primary">Edit</a>
                      <?php if($domain->server_subdomains_count == 0): ?>
                        <form action="<?php echo e(route('admin.settings.domains.destroy', $domain)); ?>" method="POST" style="display: inline;" onsubmit="return confirm('Are you sure you want to delete this domain?')">
                          <?php echo csrf_field(); ?>
                          <?php echo method_field('DELETE'); ?>
                          <button type="submit" class="btn btn-xs btn-danger">Delete</button>
                        </form>
                      <?php endif; ?>
                    </td>
                  </tr>
                <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
              </tbody>
            </table>
          <?php else: ?>
            <div class="text-center" style="padding: 50px;">
              <h4 class="text-muted">No domains configured</h4>
              <p class="text-muted">
                Configure DNS domains to enable subdomain management for servers.<br>
                <a href="<?php echo e(route('admin.settings.domains.create')); ?>" class="btn btn-primary btn-sm" style="margin-top: 10px;">Create Your First Domain</a>
              </p>
            </div>
          <?php endif; ?>
        </div>
      </div>
    </div>
  </div>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('footer-scripts'); ?>
  <?php echo \Illuminate\View\Factory::parentPlaceholder('footer-scripts'); ?>
  <script>
    $(document).ready(function() {
      $('.btn-danger').click(function(e) {
        if (!confirm('Are you sure you want to delete this domain? This action cannot be undone.')) {
          e.preventDefault();
          return false;
        }
      });
    });
  </script>
<?php $__env->stopSection(); ?>
<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /var/www/pyrodactyl/resources/views/admin/settings/domains/index.blade.php ENDPATH**/ ?>