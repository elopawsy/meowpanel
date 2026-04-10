<?php

namespace Pterodactyl\Http\Controllers\Api\Client\Servers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Pterodactyl\Http\Controllers\Api\Client\ClientApiController;
use Pterodactyl\Models\Permission;
use Pterodactyl\Models\ServerTemplate;

class ServerTemplateController extends ClientApiController
{
    /**
     * List templates visible to the current user.
     * Admins see all templates; regular users see only their own.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = ServerTemplate::with('egg:id,name')
            ->orderBy('created_at', 'desc');

        if (!$user->root_admin) {
            $query->where('created_by', $user->id);
        }

        $templates = $query->paginate(25);

        return response()->json($templates);
    }

    /**
     * Create a template from the current server.
     */
    public function store(Request $request): JsonResponse
    {
        $server = $request->attributes->get('server');
        $this->authorize(Permission::ACTION_SETTINGS_RENAME, $server);

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
     * Get a single template. Only visible to the creator or admin.
     * Returns 404 for non-owners to avoid leaking template existence.
     */
    public function show(Request $request, int $templateId): JsonResponse
    {
        $user = $request->user();

        $query = ServerTemplate::with('egg:id,name');
        if (!$user->root_admin) {
            $query->where('created_by', $user->id);
        }

        $template = $query->findOrFail($templateId);

        return response()->json(['data' => $template]);
    }

    /**
     * Delete a template.
     * Returns 404 for non-owners to avoid leaking template existence.
     */
    public function destroy(Request $request, int $templateId): Response
    {
        $user = $request->user();

        $query = ServerTemplate::query();
        if (!$user->root_admin) {
            $query->where('created_by', $user->id);
        }

        $template = $query->findOrFail($templateId);
        $template->delete();

        return response()->noContent();
    }
}
