import { z } from 'zod';

export const TOOL_NAME = "manage_scene";

export const TOOL_DESCRIPTION = `
Manages Unity scenes. Allows for loading existing scenes, saving the current scene (optionally as a new file), and creating new empty scenes.
Requires the C# MCP Unity Bridge package to be installed and running in the target Unity Editor.
`;

// --- Action Enum ---
const ManageSceneAction = z.enum([
    'load',
    'save',
    'create'
]).describe("The specific scene management operation to perform.");

// --- Save Mode Enum ---
const SaveMode = z.enum([
    'save_current', // Save changes to the currently open scene
    'save_as'       // Save the current scene to a new file path
]).describe("Specifies how the 'save' action should operate. Defaults to 'save_current'.");

// --- Main Tool Parameters Schema ---
export const ManageSceneParamsSchema = z.object({
    action: ManageSceneAction,
    scene_path: z.string().optional().describe(
        `The asset path for the scene operation.
        - Required for 'load': Path to the scene asset to load (e.g., "Assets/Scenes/Main.unity").
        - Required for 'save' when save_mode is 'save_as': The new path to save the current scene to.
        - Required for 'create': The path where the new empty scene should be created.
        - Ignored for 'save' when save_mode is 'save_current'.`
    ),
    save_mode: SaveMode.optional().default('save_current').describe(
        "Determines the behavior of the 'save' action. 'save_current' saves the active scene, 'save_as' saves it to the 'scene_path'."
    ),
    // add_to_build: z.boolean().optional().default(false).describe("If true, adds the created/saved scene to Build Settings."), // Future consideration
})
    // --- Refinements for conditional requirements ---
    .refine(data => !(data.action === 'load' && !data.scene_path), {
        message: "scene_path is required for the 'load' action.",
        path: ["scene_path"],
    })
    .refine(data => !(data.action === 'create' && !data.scene_path), {
        message: "scene_path is required for the 'create' action.",
        path: ["scene_path"],
    })
    .refine(data => !(data.action === 'save' && data.save_mode === 'save_as' && !data.scene_path), {
        message: "scene_path is required for the 'save' action when save_mode is 'save_as'.",
        path: ["scene_path"],
    });


// Define the type from the schema
export type ManageSceneParams = z.infer<typeof ManageSceneParamsSchema>;

// Define the raw parameters object for registration
export const TOOL_PARAMS = {
    action: ManageSceneAction,
    scene_path: z.string().optional().describe(
        `The asset path for the scene operation.
        - Required for 'load': Path to the scene asset to load (e.g., "Assets/Scenes/Main.unity").
        - Required for 'save' when save_mode is 'save_as': The new path to save the current scene to.
        - Required for 'create': The path where the new empty scene should be created.
        - Ignored for 'save' when save_mode is 'save_current'.`
    ),
    save_mode: SaveMode.optional().default('save_current').describe(
        "Determines the behavior of the 'save' action. 'save_current' saves the active scene, 'save_as' saves it to the 'scene_path'."
    ),
    // add_to_build: z.boolean().optional().default(false).describe("If true, adds the created/saved scene to Build Settings."),
};
