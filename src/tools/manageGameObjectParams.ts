import { z } from 'zod';

export const TOOL_NAME = "manage_gameobject";

export const TOOL_DESCRIPTION = `
Manages GameObjects within the specified or active Unity scene. Allows for creation, finding, modification, component management, and deletion of GameObjects.
Requires the C# MCP Unity Bridge package to be installed and running in the target Unity Editor.
`;

// --- Action Enum ---
const ManageGameObjectAction = z.enum([
    'create',
    'find',
    'modify',
    'add_component',
    'remove_component',
    // 'set_property', // Deferred due to complexity
    'delete'
]).describe("The specific GameObject management operation to perform.");

// --- Identifier Schema ---
// Used to find/target GameObjects
export const GameObjectIdentifierSchema = z.object({ // Added export
    name: z.string().optional().describe("Find/target GameObject by its exact name."),
    path: z.string().optional().describe("Find/target GameObject by its hierarchy path (e.g., 'Parent/Child/Target')."),
    instance_id: z.number().int().optional().describe("Target a specific GameObject by its instance ID."),
    // tag: z.string().optional().describe("Find GameObjects by tag (potentially multiple).") // Add later if needed
}).refine(data => data.name || data.path || data.instance_id, {
    message: "At least one identifier (name, path, or instance_id) must be provided.",
}).describe("Specifies how to identify the target GameObject(s). Provide at least one property.");

// --- Vector3 Schema ---
const Vector3Schema = z.object({
    x: z.number().default(0),
    y: z.number().default(0),
    z: z.number().default(0),
}).describe("Represents a 3D vector (position, rotation Euler angles, or scale).");

// --- Create Parameters Schema ---
const CreateParamsSchema = z.object({
    type: z.enum(['empty', 'primitive', 'prefab']).describe("Type of GameObject to create."),
    name: z.string().optional().describe("Name for the new GameObject. Defaults to standard names (e.g., 'GameObject', 'Cube', prefab name)."),
    primitive_type: z.enum(['Cube', 'Sphere', 'Capsule', 'Cylinder', 'Plane', 'Quad']).optional().describe("Required if type is 'primitive'."),
    prefab_path: z.string().optional().describe("Asset path to the prefab. Required if type is 'prefab'."),
    parent_identifier: GameObjectIdentifierSchema.nullable().optional().describe("Identifier for the parent GameObject. Set to null or omit to create at the scene root."),
    position: Vector3Schema.optional().describe("Local position relative to the parent."),
    rotation: Vector3Schema.optional().describe("Local rotation (Euler angles) relative to the parent."),
    scale: Vector3Schema.optional().describe("Local scale relative to the parent."),
}).refine(data => !(data.type === 'primitive' && !data.primitive_type), {
    message: "primitive_type is required when type is 'primitive'.",
    path: ["primitive_type"],
}).refine(data => !(data.type === 'prefab' && !data.prefab_path), {
    message: "prefab_path is required when type is 'prefab'.",
    path: ["prefab_path"],
});

// --- Modify Parameters Schema ---
const ModifyParamsSchema = z.object({
    name: z.string().optional().describe("New name for the GameObject."),
    tag: z.string().optional().describe("New tag for the GameObject."),
    layer: z.number().int().min(0).max(31).optional().describe("New layer index (0-31) for the GameObject."),
    active: z.boolean().optional().describe("Set the active state of the GameObject."),
    parent_identifier: GameObjectIdentifierSchema.nullable().optional().describe("Identifier for the new parent GameObject. Set to null to move to the scene root."),
    position: Vector3Schema.optional().describe("New local position relative to the parent."),
    rotation: Vector3Schema.optional().describe("New local rotation (Euler angles) relative to the parent."),
    scale: Vector3Schema.optional().describe("New local scale relative to the parent."),
}).refine(data => Object.keys(data).length > 0, {
    message: "At least one property must be provided to modify.",
});

// --- Component Parameters Schema ---
const ComponentParamsSchema = z.object({
    component_type_name: z.string().min(1).describe("Full name of the component type (e.g., 'UnityEngine.Rigidbody', 'MyNamespace.MyScript')."),
});

// --- Main Tool Parameters Schema ---
export const ManageGameObjectParamsSchema = z.object({
    action: ManageGameObjectAction,
    scene_path: z.string().optional().describe("Path to the scene asset (e.g., 'Assets/Scenes/Main.unity'). If omitted, operates on the currently active scene."),
    identifier: GameObjectIdentifierSchema.optional().describe("Identifier for the target GameObject(s). Required for most actions."),
    create_params: CreateParamsSchema.optional().describe("Parameters required for the 'create' action."),
    modify_params: ModifyParamsSchema.optional().describe("Parameters required for the 'modify' action."),
    component_params: ComponentParamsSchema.optional().describe("Parameters required for 'add_component' and 'remove_component' actions."),
    // find_multiple: z.boolean().optional().default(false).describe("For 'find' action, return all matches instead of just the first."), // Add later if needed
})
    // --- Refinements for conditional requirements ---
    .refine(data => !(data.action === 'create' && !data.create_params), {
        message: "create_params are required for the 'create' action.",
        path: ["create_params"],
    })
    // Identifier is required for modify, component actions, and delete, but OPTIONAL for find (to allow listing roots)
    .refine(data => !(['modify', 'add_component', 'remove_component', 'delete'].includes(data.action) && !data.identifier), {
        message: "identifier is required for 'modify', 'add_component', 'remove_component', and 'delete' actions.",
        path: ["identifier"],
    })
    .refine(data => !(data.action === 'modify' && !data.modify_params), {
        message: "modify_params are required for the 'modify' action.",
        path: ["modify_params"],
    })
    .refine(data => !(['add_component', 'remove_component'].includes(data.action) && !data.component_params), {
        message: "component_params are required for 'add_component' and 'remove_component' actions.",
        path: ["component_params"],
    });


// Define the type from the schema
export type ManageGameObjectParams = z.infer<typeof ManageGameObjectParamsSchema>;

// Define the raw parameters object for registration
export const TOOL_PARAMS = {
    action: ManageGameObjectAction,
    scene_path: z.string().optional().describe("Path to the scene asset (e.g., 'Assets/Scenes/Main.unity'). If omitted, operates on the currently active scene."),
    identifier: GameObjectIdentifierSchema.optional().describe("Identifier for the target GameObject(s). Required for most actions."),
    create_params: CreateParamsSchema.optional().describe("Parameters required for the 'create' action."),
    modify_params: ModifyParamsSchema.optional().describe("Parameters required for the 'modify' action."),
    component_params: ComponentParamsSchema.optional().describe("Parameters required for 'add_component' and 'remove_component' actions."),
    // find_multiple: z.boolean().optional().default(false).describe("For 'find' action, return all matches instead of just the first."),
};
