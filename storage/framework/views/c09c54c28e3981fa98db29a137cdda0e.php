<?php $__env->startSection('title'); ?>
    Locations &rarr; View &rarr; <?php echo e($location->short); ?>

<?php $__env->stopSection(); ?>

<?php $__env->startSection('content-header'); ?>
    <h1><?php echo e($location->short); ?><small><?php echo e(str_limit($location->long, 75)); ?></small></h1>
    <ol class="breadcrumb">
        <li><a href="<?php echo e(route('admin.index')); ?>">Admin</a></li>
        <li><a href="<?php echo e(route('admin.locations')); ?>">Locations</a></li>
        <li class="active"><?php echo e($location->short); ?></li>
    </ol>
<?php $__env->stopSection(); ?>

<?php $__env->startSection('content'); ?>
<?php
    $totalMemory = 0;
    $allocatedMemory = 0;
    $totalDisk = 0;
    $allocatedDisk = 0;

    foreach ($location->nodes as $node) {
        $memoryLimit = $node->memory * (1 + ($node->memory_overallocate / 100));
        $diskLimit = $node->disk * (1 + ($node->disk_overallocate / 100));

        $totalMemory += $memoryLimit;
        $totalDisk += $diskLimit;

        $nodeAllocatedMemory = $node->servers->where('exclude_from_resource_calculation', false)->sum('memory');
        $nodeAllocatedDisk = $node->servers->where('exclude_from_resource_calculation', false)->sum('disk');

        $allocatedMemory += $nodeAllocatedMemory;
        $allocatedDisk += $nodeAllocatedDisk;
    }

    $memoryPercent = $totalMemory > 0 ? ($allocatedMemory / $totalMemory) * 100 : 0;
    $diskPercent = $totalDisk > 0 ? ($allocatedDisk / $totalDisk) * 100 : 0;

    $memoryColor = $memoryPercent < 50 ? '#50af51' : ($memoryPercent < 70 ? '#e0a800' : '#d9534f');
    $diskColor = $diskPercent < 50 ? '#50af51' : ($diskPercent < 70 ? '#e0a800' : '#d9534f');
?>
<div class="row">
    <div class="col-sm-6">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Location Details</h3>
            </div>
            <form action="<?php echo e(route('admin.locations.view', $location->id)); ?>" method="POST">
                <div class="box-body">
                    <div class="form-group">
                        <label for="pShort" class="form-label">Short Code</label>
                        <input type="text" id="pShort" name="short" class="form-control" value="<?php echo e($location->short); ?>" />
                    </div>
                    <div class="form-group">
                        <label for="pLong" class="form-label">Description</label>
                        <textarea id="pLong" name="long" class="form-control" rows="4"><?php echo e($location->long); ?></textarea>
                    </div>
                </div>
                <div class="box-footer">
                    <?php echo csrf_field(); ?>

                    <?php echo method_field('PATCH'); ?>

                    <button name="action" value="edit" class="btn btn-sm btn-primary pull-right">Save</button>
                    <button name="action" value="delete" class="btn btn-sm btn-danger pull-left muted muted-hover"><i class="fa fa-trash-o"></i></button>
                </div>
            </form>
        </div>
    </div>
    <div class="col-sm-6">
        <div class="box box-default">
            <div class="box-header with-border">
                <h3 class="box-title">Resource Allocation</h3>
            </div>
            <div class="box-body">
                <div class="row">
                    <div class="col-sm-6">
                        <h4>Memory</h4>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" style="width: <?php echo e(min($memoryPercent, 100)); ?>%; background-color: <?php echo e($memoryColor); ?>;" aria-valuenow="<?php echo e($memoryPercent); ?>" aria-valuemin="0" aria-valuemax="100"><?php echo e(round($memoryPercent)); ?>%</div>
                        </div>
                        <p>
                            <strong>Allocated:</strong> <?php echo e(humanizeSize($allocatedMemory * 1024 * 1024)); ?><br>
                            <strong>Total:</strong> <?php echo e(humanizeSize($totalMemory * 1024 * 1024)); ?>

                        </p>
                    </div>
                    <div class="col-sm-6">
                        <h4>Disk</h4>
                        <div class="progress" style="height: 20px;">
                            <div class="progress-bar" role="progressbar" style="width: <?php echo e(min($diskPercent, 100)); ?>%; background-color: <?php echo e($diskColor); ?>;" aria-valuenow="<?php echo e($diskPercent); ?>" aria-valuemin="0" aria-valuemax="100"><?php echo e(round($diskPercent)); ?>%</div>
                        </div>
                        <p>
                            <strong>Allocated:</strong> <?php echo e(humanizeSize($allocatedDisk * 1024 * 1024)); ?><br>
                            <strong>Total:</strong> <?php echo e(humanizeSize($totalDisk * 1024 * 1024)); ?>

                        </p>
                    </div>
                </div>
            </div>
        </div>
        <div class="box">
            <div class="box-header with-border">
                <h3 class="box-title">Nodes</h3>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>FQDN</th>
                            <th>Memory</th>
                            <th>Disk</th>
                            <th>Servers</th>
                        </tr>
                    </thead>
                    <?php $__currentLoopData = $location->nodes; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $node): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                        <tr>
                            <td><code><?php echo e($node->id); ?></code></td>
                            <td><a href="<?php echo e(route('admin.nodes.view', $node->id)); ?>"><?php echo e($node->name); ?></a></td>
                            <td><code><?php echo e($node->fqdn); ?></code></td>
                            <?php
                                $nodeMemoryLimit = $node->memory * (1 + ($node->memory_overallocate / 100));
                                $nodeAllocatedMemory = $node->servers->where('exclude_from_resource_calculation', false)->sum('memory');
                                $nodeMemoryPercent = $nodeMemoryLimit > 0 ? ($nodeAllocatedMemory / $nodeMemoryLimit) * 100 : 0;

                                $nodeDiskLimit = $node->disk * (1 + ($node->disk_overallocate / 100));
                                $nodeAllocatedDisk = $node->servers->where('exclude_from_resource_calculation', false)->sum('disk');
                                $nodeDiskPercent = $nodeDiskLimit > 0 ? ($nodeAllocatedDisk / $nodeDiskLimit) * 100 : 0;

                                $nodeMemoryColor = $nodeMemoryPercent < 50 ? '#50af51' : ($nodeMemoryPercent < 70 ? '#e0a800' : '#d9534f');
                                $nodeDiskColor = $nodeDiskPercent < 50 ? '#50af51' : ($nodeDiskPercent < 70 ? '#e0a800' : '#d9534f');
                            ?>
                            <td style="color: <?php echo e($nodeMemoryColor); ?>"><?php echo e(round($nodeMemoryPercent)); ?>%</td>
                            <td style="color: <?php echo e($nodeDiskColor); ?>"><?php echo e(round($nodeDiskPercent)); ?>%</td>
                            <td><?php echo e($node->servers->count()); ?></td>
                        </tr>
                    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
                </table>
            </div>
        </div>
    </div>
</div>
<?php $__env->stopSection(); ?>

<?php echo $__env->make('layouts.admin', array_diff_key(get_defined_vars(), ['__data' => 1, '__path' => 1]))->render(); ?><?php /**PATH /var/www/pyrodactyl/resources/views/admin/locations/view.blade.php ENDPATH**/ ?>