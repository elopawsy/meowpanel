<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />

    <style type="text/css" rel="stylesheet" media="all">
        /* Media Queries */
        @media only screen and (max-width: 500px) {
            .button {
                width: 100% !important;
            }
        }
    </style>
</head>

<?php

$style = [
    /* Layout ------------------------------ */

    'body' => 'margin: 0; padding: 0; width: 100%; background-color: #0a0a0a;',
    'email-wrapper' => 'width: 100%; margin: 0; padding: 0; background-color: #0a0a0a;',

    /* Masthead ----------------------- */

    'email-masthead' => 'padding: 25px 0; text-align: center;',
    'email-masthead_name' => 'font-size: 16px; font-weight: bold; color: #ef4444; text-decoration: none;',

    'email-body' => 'width: 100%; margin: 0; padding: 0; border-top: 1px solid #1f1f1f; border-bottom: 1px solid #1f1f1f; background-color: #141414;',
    'email-body_inner' => 'width: auto; max-width: 570px; margin: 0 auto; padding: 0;',
    'email-body_cell' => 'padding: 35px;',

    'email-footer' => 'width: auto; max-width: 570px; margin: 0 auto; padding: 0; text-align: center;',
    'email-footer_cell' => 'color: #6b7280; padding: 35px; text-align: center;',

    /* Body ------------------------------ */

    'body_action' => 'width: 100%; margin: 30px auto; padding: 0; text-align: center;',
    'body_sub' => 'margin-top: 25px; padding-top: 25px; border-top: 1px solid #1f1f1f;',

    /* Type ------------------------------ */

    'anchor' => 'color: #ef4444; text-decoration: underline;',
    'header-1' => 'margin-top: 0; color: #f9fafb; font-size: 19px; font-weight: bold; text-align: left;',
    'paragraph' => 'margin-top: 0; color: #9ca3af; font-size: 16px; line-height: 1.5em;',
    'paragraph-sub' => 'margin-top: 0; color: #6b7280; font-size: 12px; line-height: 1.5em;',
    'paragraph-center' => 'text-align: center;',

    /* Buttons ------------------------------ */

    'button' => 'display: inline-block; width: 200px; min-height: 20px; padding: 10px;
                 background-color: #ef4444; border-radius: 3px; color: #ffffff; font-size: 15px; line-height: 25px;
                 text-align: center; text-decoration: none;',

    'button--green' => 'background-color: #10b981;',
    'button--red' => 'background-color: #dc2626;',
    'button--blue' => 'background-color: #ef4444;',
];
?>

<?php $fontFamily = 'font-family: Arial, \'Helvetica Neue\', Helvetica, sans-serif;'; ?>

<body style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['body']); ?>">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr>
            <td style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['email-wrapper']); ?>" align="center">
                <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                    <!-- Logo -->
                    <tr>
                        <td style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['email-masthead']); ?>">
                            <a style="<?php echo new \Illuminate\Support\EncodedHtmlString($fontFamily); ?> <?php echo new \Illuminate\Support\EncodedHtmlString($style['email-masthead_name']); ?>" href="<?php echo new \Illuminate\Support\EncodedHtmlString(url('/')); ?>" target="_blank">
                                <?php echo new \Illuminate\Support\EncodedHtmlString(config('app.name')); ?>

                            </a>
                        </td>
                    </tr>

                    <!-- Email Body -->
                    <tr>
                        <td style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['email-body']); ?>" width="100%">
                            <table style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['email-body_inner']); ?>" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td style="<?php echo new \Illuminate\Support\EncodedHtmlString($fontFamily); ?> <?php echo new \Illuminate\Support\EncodedHtmlString($style['email-body_cell']); ?>">
                                        <!-- Greeting -->
                                        <h1 style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['header-1']); ?>">
                                            <?php if(! empty($greeting)): ?>
                                                <?php echo new \Illuminate\Support\EncodedHtmlString($greeting); ?>

                                            <?php else: ?>
                                                <?php if($level == 'error'): ?>
                                                    Whoops!
                                                <?php else: ?>
                                                    Hello!
                                                <?php endif; ?>
                                            <?php endif; ?>
                                        </h1>

                                        <!-- Intro -->
                                        <?php $__currentLoopData = $introLines; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $line): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                            <p style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['paragraph']); ?>">
                                                <?php echo new \Illuminate\Support\EncodedHtmlString($line); ?>

                                            </p>
                                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                        <!-- Action Button -->
                                        <?php if(isset($actionText)): ?>
                                            <table style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['body_action']); ?>" align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                                                <tr>
                                                    <td align="center">
                                                        <?php
                                                            switch ($level) {
                                                                case 'success':
                                                                    $actionColor = 'button--green';
                                                                    break;
                                                                case 'error':
                                                                    $actionColor = 'button--red';
                                                                    break;
                                                                default:
                                                                    $actionColor = 'button--blue';
                                                            }
                                                        ?>

                                                        <a href="<?php echo new \Illuminate\Support\EncodedHtmlString($actionUrl); ?>"
                                                            style="<?php echo new \Illuminate\Support\EncodedHtmlString($fontFamily); ?> <?php echo new \Illuminate\Support\EncodedHtmlString($style['button']); ?> <?php echo new \Illuminate\Support\EncodedHtmlString($style[$actionColor]); ?>"
                                                            class="button"
                                                            target="_blank" rel="noopener">
                                                            <?php echo new \Illuminate\Support\EncodedHtmlString($actionText); ?>

                                                        </a>
                                                    </td>
                                                </tr>
                                            </table>
                                        <?php endif; ?>

                                        <!-- Outro -->
                                        <?php $__currentLoopData = $outroLines; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $line): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                                            <p style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['paragraph']); ?>">
                                                <?php echo new \Illuminate\Support\EncodedHtmlString($line); ?>

                                            </p>
                                        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

                                        <!-- Salutation -->
                                        <p style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['paragraph']); ?>">
                                            Regards,<br><?php echo new \Illuminate\Support\EncodedHtmlString(config('app.name')); ?>

                                        </p>

                                        <!-- Sub Copy -->
                                        <?php if(isset($actionText)): ?>
                                            <table style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['body_sub']); ?>" role="presentation">
                                                <tr>
                                                    <td style="<?php echo new \Illuminate\Support\EncodedHtmlString($fontFamily); ?>">
                                                        <p style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['paragraph-sub']); ?>">
                                                            If you're having trouble clicking the "<?php echo new \Illuminate\Support\EncodedHtmlString($actionText); ?>" button,
                                                            copy and paste the URL below into your web browser:
                                                        </p>

                                                        <p style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['paragraph-sub']); ?>">
                                                            <a style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['anchor']); ?>" href="<?php echo new \Illuminate\Support\EncodedHtmlString($actionUrl); ?>" target="_blank" rel="noopener">
                                                                <?php echo new \Illuminate\Support\EncodedHtmlString($actionUrl); ?>

                                                            </a>
                                                        </p>
                                                    </td>
                                                </tr>
                                            </table>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td>
                            <table style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['email-footer']); ?>" align="center" width="570" cellpadding="0" cellspacing="0" role="presentation">
                                <tr>
                                    <td style="<?php echo new \Illuminate\Support\EncodedHtmlString($fontFamily); ?> <?php echo new \Illuminate\Support\EncodedHtmlString($style['email-footer_cell']); ?>">
                                        <p style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['paragraph-sub']); ?>">
                                            &copy; <?php echo new \Illuminate\Support\EncodedHtmlString(date('Y')); ?>

                                            <a style="<?php echo new \Illuminate\Support\EncodedHtmlString($style['anchor']); ?>" href="<?php echo new \Illuminate\Support\EncodedHtmlString(url('/')); ?>" target="_blank" rel="noopener"><?php echo new \Illuminate\Support\EncodedHtmlString(config('app.name')); ?></a>.
                                            All rights reserved.
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
<?php /**PATH /var/www/pyrodactyl/resources/views/vendor/notifications/email.blade.php ENDPATH**/ ?>