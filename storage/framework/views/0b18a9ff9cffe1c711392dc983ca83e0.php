<?php $__env->startSection('title'); ?>
    Locations
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content-header'); ?>
    <h1>Locations<small>All locations that nodes can be assigned to for easier categorization.</small></h1>
    <ol class="breadcrumb">
        <li><a href="<?php echo e(route('admin.index')); ?>">Admin</a></li>
        <li class="active">Locations</li>
    </ol>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content'); ?>
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Location List</h3>
                <div class="box-tools">
                    <button class="btn btn-sm btn-primary" data-toggle="modal" data-target="#newLocationModal">Create New</button>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Short Code</th>
                            <th>Description</th>
                            <th class="text-center">Memory Alloc%</th>
                            <th class="text-center">Disk Alloc%</th>
                            <th class="text-center">Nodes</th>
                            <th class="text-center">Servers</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php $__currentLoopData = $locations; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $location): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                            <?php
                                $memoryColor = $location->memory_percent < 50 ? '#50af51' : ($location->memory_percent < 70 ? '#e0a800' : '#d9534f');
                                $diskColor = $location->disk_percent < 50 ? '#50af51' : ($location->disk_percent < 70 ? '#e0a800' : '#d9534f');
                            ?>
                            <tr>
                                <td><code><?php echo e($location->id); ?></code></td>
                                <td><a href="<?php echo e(route('admin.locations.view', $location->id)); ?>"><?php echo e($location->short); ?></a></td>
                                <td><?php echo e($location->long); ?></td>
                                <td class="text-center" style="color: <?php echo e($memoryColor); ?>" title="Allocated: <?php echo e(humanizeSize($location->allocated_memory * 1024 * 1024)); ?> / Total: <?php echo e(humanizeSize($location->total_memory * 1024 * 1024)); ?>">
                                    <?php echo e(round($location->memory_percent)); ?>%
                                </td>
                                <td class="text-center" style="color: <?php echo e($diskColor); ?>" title="Allocated: <?php echo e(humanizeSize($location->allocated_disk * 1024 * 1024)); ?> / Total: <?php echo e(humanizeSize($location->total_disk * 1024 * 1024)); ?>">
                                    <?php echo e(round($location->disk_percent)); ?>%
                                </td>
                                <td class="text-center"><?php echo e($location->nodes_count); ?></td>
                                <td class="text-center"><?php echo e($location->servers_count); ?></td>
                            </tr>
                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>
<div class="modal fade" id="newLocationModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <form action="<?php echo e(route('admin.locations')); ?>" method="POST">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Create Location</h4>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-12">
                            <label for="pShortModal" class="form-label">Short Code</label>
                            <input type="text" name="short" id="pShortModal" class="form-control" />
                            <p class="text-muted small">A short identifier used to distinguish this location from others. Must be between 1 and 60 characters, for example, <code>us.nyc.lvl3</code>.</p>
                        </div>
                        <div class="col-md-12">
                            <label for="pLongModal" class="form-label">Description</label>
                            <textarea name="long" id="pLongModal" class="form-control" rows="4"></textarea>
                            <p class="text-muted small">A longer description of this location. Must be less than 191 characters.</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <?php echo csrf_field(); ?>

                    <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-success btn-sm">Create</button>
                </div>
            </form>
        </div>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /var/www/pyrodactyl/resources/views/admin/locations/index.blade.php ENDPATH**/ ?>