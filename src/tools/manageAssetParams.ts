import { z } from 'zod';

export const TOOL_NAME = "manage_asset";

export const TOOL_DESCRIPTION = `
Manages assets within the connected Unity project. Allows for creation, deletion, moving, renaming, importing, getting info, and finding usages of assets and folders.
Requires the C# MCP Unity Bridge package to be installed and running in the target Unity Editor.
`;

// Define the possible actions as a Zod enum
const ManageAssetAction = z.enum([
    'create_folder',
    'create_asset',
    'delete',
    'move',
    'rename',
    'import',
    'get_info',
    'find_usages',
    'create_prefab' // Added new action
]).describe("The specific asset management operation to perform.");

// Re-use GameObjectIdentifierSchema from manageGameObjectParams
// We need to import it, assuming it's exported there.
// If not, we'd need to define it here or in a shared types file.
// For now, let's assume it's exported from manageGameObjectParams.js
// (We'll need to add the import statement later)
import { GameObjectIdentifierSchema } from './manageGameObjectParams.js'; // Placeholder import

// Define the base schema
export const ManageAssetParamsSchema = z.object({
    action: ManageAssetAction,
    path: z.string().min(1).describe(
        `The primary path for the operation.
        - For 'create_folder', 'create_asset', 'delete', 'get_info', 'find_usages': The target Unity project path (e.g., "Assets/MyFolder", "Assets/MyMaterial.mat").
        - For 'move', 'rename': The source Unity project path.
        - For 'import': The source file path *outside* the Unity project.`
    ),
    destination_path: z.string().min(1).optional().describe(
        `The destination path.
        - Required for 'move': The target Unity project path for the moved asset/folder.
        - Required for 'rename': The new Unity project path for the asset/folder.
        - Required for 'import': The target Unity project path where the asset will be imported.`
    ),
    asset_type: z.string().min(1).optional().describe(
        `The type of asset to create. Required only for the 'create_asset' action.
        Examples: 'Material', 'ScriptableObject', 'CSharpScript', 'TextureImporter', 'AudioClip'.
        Note: This corresponds to Unity class names or common asset types.`
    ),
    force: z.boolean().optional().default(false).describe(
        "If true, forces the operation even if it might overwrite or delete existing assets without confirmation (e.g., for 'delete', 'move', 'import'). Defaults to false."
    ),
    source_gameobject_identifier: GameObjectIdentifierSchema.optional().describe(
        "Required for 'create_prefab' action. Identifier for the source GameObject in the current scene to create the prefab from."
    ),
    // TODO: Define import_settings schema if needed for 'import' action
    // import_settings: z.object({}).optional().describe("Optional settings specific to the 'import' action."),
}).refine(data => {
    // Validation for destination_path requirement
    if ((data.action === 'move' || data.action === 'rename' || data.action === 'import') && !data.destination_path) {
        return false; // destination_path is required for move, rename, import
    }
    return true;
}, {
    message: "destination_path is required for 'move', 'rename', and 'import' actions.",
    path: ["destination_path"], // Field responsible for the error
}).refine(data => {
    // Validation for asset_type requirement
    if (data.action === 'create_asset' && !data.asset_type) {
        return false; // asset_type is required for create_asset
    }
    return true;
}, {
    message: "asset_type is required for the 'create_asset' action.",
    path: ["asset_type"], // Field responsible for the error
}).refine(data => {
    // Validation for create_prefab requirements
    if (data.action === 'create_prefab') {
        // Check path exists and ends with .prefab (case-insensitive)
        if (!data.path || !data.path.toLowerCase().endsWith('.prefab')) {
            return false;
        }
        // Check source identifier exists
        if (!data.source_gameobject_identifier) {
            return false; // Source identifier is required
        }
    }
    return true;
}, {
    message: "For 'create_prefab', 'path' (ending in .prefab) and 'source_gameobject_identifier' are required.",
    // Specify multiple paths if the error could relate to either
    path: ["path", "source_gameobject_identifier"],
});


// Define the type from the schema
export type ManageAssetParams = z.infer<typeof ManageAssetParamsSchema>;

// Define the raw parameters object for registration, matching the schema structure
export const TOOL_PARAMS = {
    action: ManageAssetAction,
    path: z.string().min(1).describe(
        `The primary path for the operation.
        - For 'create_folder', 'create_asset', 'delete', 'get_info', 'find_usages': The target Unity project path (e.g., "Assets/MyFolder", "Assets/MyMaterial.mat").
        - For 'move', 'rename': The source Unity project path.
        - For 'import': The source file path *outside* the Unity project.`
    ),
    destination_path: z.string().min(1).optional().describe(
        `The destination path.
        - Required for 'move': The target Unity project path for the moved asset/folder.
        - Required for 'rename': The new Unity project path for the asset/folder.
        - Required for 'import': The target Unity project path where the asset will be imported.`
    ),
    asset_type: z.string().min(1).optional().describe(
        `The type of asset to create. Required only for the 'create_asset' action.
        Examples: 'Material', 'ScriptableObject', 'CSharpScript', 'TextureImporter', 'AudioClip'.
        Note: This corresponds to Unity class names or common asset types.`
    ),
    force: z.boolean().optional().default(false).describe(
        "If true, forces the operation even if it might overwrite or delete existing assets without confirmation (e.g., for 'delete', 'move'). Defaults to false."
    ),
    // TODO: Define import_settings schema if needed for 'import' action
    // import_settings: z.object({}).optional().describe("Optional settings specific to the 'import' action."),
    source_gameobject_identifier: GameObjectIdentifierSchema.optional().describe(
        "Required for 'create_prefab' action. Identifier for the source GameObject in the current scene."
    ),
};

// Example Usage (for documentation or testing)
const exampleCreateFolder: ManageAssetParams = { action: 'create_folder', path: 'Assets/NewFolder', force: false };
const exampleCreateAsset: ManageAssetParams = { action: 'create_asset', path: 'Assets/MyNewMaterial.mat', asset_type: 'Material', force: false };
const exampleDelete: ManageAssetParams = { action: 'delete', path: 'Assets/OldAsset.prefab', force: true };
const exampleMove: ManageAssetParams = { action: 'move', path: 'Assets/Source/MyScript.cs', destination_path: 'Assets/Destination/MyScript.cs', force: false };
const exampleRename: ManageAssetParams = { action: 'rename', path: 'Assets/OldName.mat', destination_path: 'Assets/NewName.mat', force: false };
const exampleImport: ManageAssetParams = { action: 'import', path: 'C:/Users/Me/Downloads/MyTexture.png', destination_path: 'Assets/Textures/MyTexture.png', force: false };
const exampleGetInfo: ManageAssetParams = { action: 'get_info', path: 'Assets/MyModel.fbx', force: false };
const exampleFindUsages: ManageAssetParams = { action: 'find_usages', path: 'Assets/SharedMaterial.mat', force: false };
const exampleCreatePrefab: ManageAssetParams = { action: 'create_prefab', path: 'Assets/MyPrefab.prefab', source_gameobject_identifier: { name: "SourceObjectName" }, force: false };
