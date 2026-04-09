<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\ServerTemplate;

class ServerTemplateController extends ClientApiController
{
    /**
     * List all available templates.
     */
    public function index(): JsonResponse
    {
        $templates = ServerTemplate::with('egg:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json(['data' => $templates]);
    }

    /**
     * Create a template from the current server.
     */
    public function store(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_WEBSOCKET_CONNECT, $server);

        $validated = $request->validate([
            'name' => 'required|string|max:191',
            'description' => 'nullable|string|max:2000',
        ]);

        $server->load('variables');

        $template = ServerTemplate::fromServer(
            $server,
            $validated['name'],
            $validated['description'] ?? null,
        );

        return response()->json(['data' => $template->load('egg:id,name')], 201);
    }

    /**
     * Get a single template.
     */
    public function show(Request $request, int $templateId): JsonResponse
    {
        $template = ServerTemplate::with('egg:id,name')->findOrFail($templateId);

        return response()->json(['data' => $template]);
    }

    /**
     * Delete a template.
     */
    public function destroy(Request $request, int $templateId): JsonResponse
    {
        $user = $request->user();
        $template = ServerTemplate::findOrFail($templateId);

        // Only creator or admin can delete
        if ($template->created_by !== $user->id && !$user->root_admin) {
            return response()->json(['error' => 'Unauthorized.'], 403);
        }

        $template->delete();

        return response()->json([], 204);
    }
}
