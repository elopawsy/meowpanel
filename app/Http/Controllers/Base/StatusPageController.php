<?php

namespace Pterodactyl\Http\Controllers\Base;

use Illuminate\Routing\Controller;
use Illuminate\View\View;

class StatusPageController extends Controller
{
    public function index(): View
    {
        return view('status');
    }
}
