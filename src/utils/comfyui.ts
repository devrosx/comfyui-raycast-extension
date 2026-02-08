import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import { basename } from "path";
import { randomUUID } from "crypto";

// Generate unique filename if file already exists
function getUniqueFilename(basePath: string, suffix: string, extension: string): string {
  let counter = 1;
  let testPath = `${basePath}${suffix}${extension}`;
  
  while (existsSync(testPath)) {
    testPath = `${basePath}${suffix}_${counter}${extension}`;
    counter++;
  }
  
  return testPath;
}

interface WorkflowNode {
  class_type?: string;
  inputs?: Record<string, any>;
  _meta?: {
    title?: string;
  };
}

interface Workflow {
  [key: string]: WorkflowNode;
}

export async function getWorkflows(workflowsPath: string): Promise<{ name: string; path: string }[]> {
  try {
    const files = await fs.readdir(workflowsPath);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        name: f,
        path: `${workflowsPath}/${f}`,
      }));
  } catch {
    return [];
  }
}

export async function analyzeWorkflow(workflowPath: string): Promise<{
  hasLoadImage: boolean;
  hasPromptNode: boolean;
}> {
  try {
    const content = await fs.readFile(workflowPath, "utf-8");
    const workflow: Workflow = JSON.parse(content);

    let hasLoadImage = false;
    let hasPromptNode = false;

    for (const node of Object.values(workflow)) {
      // Support both LoadImage and LoadImages
      if (node.class_type === "LoadImage" || node.class_type === "LoadImages") {
        hasLoadImage = true;
      }
      if (
        node.class_type === "PrimitiveStringMultiline" ||
        node.class_type === "CLIPTextEncode" ||
        node.class_type === "ImpactWildcardProcessor"
      ) {
        hasPromptNode = true;
      }
    }

    return { hasLoadImage, hasPromptNode };
  } catch {
    return { hasLoadImage: false, hasPromptNode: false };
  }
}

export interface LoraNode {
  nodeId: string;
  title: string;
  loraName: string;
  strengthModel: number;
  strengthClip: number;
}

export interface WorkflowParameters {
  positivePrompt?: string;
  negativePrompt?: string;
  batchSize?: number;
  width?: number;
  height?: number;
  clipName?: string;
  vaeName?: string;
  loraName?: string;
  unetName?: string;
  mode?: string;
  loadImageNodes?: Array<{
    nodeId: string;
    title: string;
    inputKey: string;
  }>;
  loraNodes?: LoraNode[];
  loraUpdates?: Record<string, { strengthModel?: number; strengthClip?: number }>;
}

export async function extractWorkflowParameters(workflowPath: string): Promise<WorkflowParameters> {
  try {
    const content = await fs.readFile(workflowPath, "utf-8");
    const workflow: Workflow = JSON.parse(content);

    const params: WorkflowParameters = {
      loadImageNodes: [],
      loraNodes: [],
    };

    for (const [nodeId, node] of Object.entries(workflow)) {
      // Extract LoadImage nodes
      if (node.class_type === "LoadImage" || node.class_type === "LoadImages") {
        const title = node._meta?.title || `Load Image ${params.loadImageNodes!.length + 1}`;
        const inputKey = node.class_type === "LoadImages" ? "images" : "image";
        
        params.loadImageNodes!.push({
          nodeId,
          title,
          inputKey,
        });
      }
      // Extract LoRA loader nodes
      if (node.class_type === "LoraLoader" || node.class_type === "LoraLoaderModelOnly" || node.class_type === "Power Lora Loader (rgthree)") {
        const title = node._meta?.title || `LoRA ${params.loraNodes!.length + 1}`;
        const loraName = node.inputs?.lora_name ? String(node.inputs.lora_name) : "";
        const strengthModel = node.inputs?.strength_model !== undefined ? Number(node.inputs.strength_model) : 1.0;
        const strengthClip = node.inputs?.strength_clip !== undefined ? Number(node.inputs.strength_clip) : 1.0;

        if (loraName) {
          params.loraNodes!.push({
            nodeId,
            title,
            loraName,
            strengthModel,
            strengthClip,
          });
        }
      }

      // Extract prompts
      if (node.class_type === "CLIPTextEncode" ||
          node.class_type === "PrimitiveStringMultiline" ||
          node.class_type === "ImpactWildcardProcessor") {
        const title = node._meta?.title?.toLowerCase() || "";
        const text = node.inputs?.text || node.inputs?.value || "";
        
        if (title.includes("positive") || title.includes("prompt")) {
          if (!params.positivePrompt && text) {
            params.positivePrompt = String(text);
          }
        } else if (title.includes("negative")) {
          if (!params.negativePrompt && text) {
            params.negativePrompt = String(text);
          }
        } else if (!params.positivePrompt && text) {
          // First prompt without specific label = positive
          params.positivePrompt = String(text);
        }
      }

      // Extract batch_size from any node that has it
      if (node.inputs?.batch_size !== undefined && !isNaN(Number(node.inputs.batch_size))) {
        params.batchSize = Number(node.inputs.batch_size);
      }

      // Extract width and height from latent/image nodes
      if (node.inputs?.width !== undefined && !isNaN(Number(node.inputs.width))) {
        params.width = Number(node.inputs.width);
      }
      if (node.inputs?.height !== undefined && !isNaN(Number(node.inputs.height))) {
        params.height = Number(node.inputs.height);
      }

      // Extract model information
      // Checkpoint/CLIP
      if (node.inputs?.ckpt_name && !params.clipName) {
        params.clipName = String(node.inputs.ckpt_name);
      }
      if (node.inputs?.clip_name && !params.clipName) {
        params.clipName = String(node.inputs.clip_name);
      }

      // VAE
      if (node.inputs?.vae_name && !params.vaeName) {
        params.vaeName = String(node.inputs.vae_name);
      }

      // LoRA
      if (node.inputs?.lora_name && !params.loraName) {
        params.loraName = String(node.inputs.lora_name);
      }

      // UNET/Model
      if (node.inputs?.unet_name && !params.unetName) {
        params.unetName = String(node.inputs.unet_name);
      }
      if (node.inputs?.model_name && !params.unetName) {
        params.unetName = String(node.inputs.model_name);
      }

      // Mode/Sampler
      if (node.inputs?.sampler_name && !params.mode) {
        params.mode = String(node.inputs.sampler_name);
      }
      if (node.inputs?.scheduler && params.mode) {
        params.mode += ` / ${node.inputs.scheduler}`;
      }
    }

    return params;
  } catch (error) {
    return {};
  }
}

async function checkServerAvailability(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/system_stats`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function turnOnServer(
  haUrl?: string,
  haToken?: string,
  switchEntity?: string
): Promise<boolean> {
  if (!haUrl || !haToken || !switchEntity) {
    return false;
  }

  try {
    const response = await fetch(`${haUrl}/api/services/switch/turn_on`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${haToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_id: switchEntity,
      }),
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function ensureServerRunning(
  serverUrl: string,
  haUrlInternal?: string,
  haUrlExternal?: string,
  haToken?: string,
  switchEntity?: string
): Promise<boolean> {
  // Zkontrolovat zda server už běží
  if (await checkServerAvailability(serverUrl)) {
    return true;
  }

  // Pokud neběží, zkusit ho zapnout přes HA
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Server not available",
    message: "Pokouším se zapnout...",
  });

  // Zkusit interní URL
  if (haUrlInternal && (await turnOnServer(haUrlInternal, haToken, switchEntity))) {
    toast.message = "Čekám na naběhnutí serveru...";
    
    // Počkat až server naběhne (max 5 minut)
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (await checkServerAvailability(serverUrl)) {
        toast.style = Toast.Style.Success;
        toast.title = "Server is ready";
        return true;
      }
    }
  }

  // Zkusit externí URL jako fallback
  if (haUrlExternal && (await turnOnServer(haUrlExternal, haToken, switchEntity))) {
    toast.message = "Čekám na naběhnutí serveru...";
    
    for (let i = 0; i < 60; i++) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
      if (await checkServerAvailability(serverUrl)) {
        toast.style = Toast.Style.Success;
        toast.title = "Server is ready";
        return true;
      }
    }
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Server not available";
  toast.message = "Check connection";
  return false;
}

async function uploadImage(serverUrl: string, imagePath: string): Promise<string> {
  const formData = new FormData();
  formData.append("image", createReadStream(imagePath));
  formData.append("overwrite", "true");

  const response = await fetch(`${serverUrl}/upload/image`, {
    method: "POST",
    body: formData as any,
  });

  if (!response.ok) {
    throw new Error(`Upload error: ${response.statusText}`);
  }

  const result: any = await response.json();
  return result.name || basename(imagePath);
}

function setWorkflowImage(workflow: Workflow, imageFilename: string): Workflow {
  const updated = { ...workflow };
  
  for (const [nodeId, node] of Object.entries(updated)) {
    if (node.class_type === "LoadImage" || node.class_type === "LoadImages") {
      if (!node.inputs) {
        node.inputs = {};
      }
      const inputKey = node.class_type === "LoadImages" ? "images" : "image";
      node.inputs[inputKey] = imageFilename;
      break; // Only set first LoadImage for single-image workflows
    }
  }
  
  return updated;
}

// New function: Set specific images to specific LoadImage nodes
function setWorkflowImages(workflow: Workflow, imageMap: Record<string, string>): Workflow {
  const updated = { ...workflow };
  
  for (const [nodeId, imageFilename] of Object.entries(imageMap)) {
    const node = updated[nodeId];
    if (node && (node.class_type === "LoadImage" || node.class_type === "LoadImages")) {
      if (!node.inputs) {
        node.inputs = {};
      }
      const inputKey = node.class_type === "LoadImages" ? "images" : "image";
      node.inputs[inputKey] = imageFilename;
    }
  }
  
  return updated;
}

function setWorkflowPrompt(workflow: Workflow, promptText: string): Workflow {
  const updated = { ...workflow };
  const promptKeywords = ["prompt", "positive", "text prompt", "clip text"];

  for (const [nodeId, node] of Object.entries(updated)) {
    const classType = node.class_type || "";
    const metaTitle = (node._meta?.title || "").toLowerCase();
    let isPromptNode = false;
    let fieldName: string | null = null;

    if (classType === "PrimitiveStringMultiline") {
      if (promptKeywords.some((kw) => metaTitle.includes(kw))) {
        isPromptNode = true;
        fieldName = "value";
      } else if (node.inputs && "value" in node.inputs) {
        isPromptNode = true;
        fieldName = "value";
      }
    } else if (classType === "CLIPTextEncode") {
      if (promptKeywords.some((kw) => metaTitle.includes(kw)) && !metaTitle.includes("negative")) {
        isPromptNode = true;
        fieldName = "text";
      } else if (node.inputs && "text" in node.inputs) {
        isPromptNode = true;
        fieldName = "text";
      }
    } else if (classType === "ImpactWildcardProcessor") {
      if (promptKeywords.some((kw) => metaTitle.includes(kw))) {
        isPromptNode = true;
        fieldName = "wildcard_text";
      }
    }

    if (isPromptNode && fieldName) {
      if (!node.inputs) {
        node.inputs = {};
      }
      node.inputs[fieldName] = promptText;
      break;
    }
  }

  return updated;
}

export function updateWorkflowParameters(
  workflow: Workflow,
  params: {
    positivePrompt?: string;
    negativePrompt?: string;
    batchSize?: number;
    width?: number;
    height?: number;
    loraUpdates?: Record<string, { strengthModel?: number; strengthClip?: number }>;
  }
): Workflow {
  const updated = { ...workflow };

  for (const [nodeId, node] of Object.entries(updated)) {
    const classType = node.class_type || "";
    const metaTitle = (node._meta?.title || "").toLowerCase();

    // Update prompts
    if (classType === "CLIPTextEncode" ||
        classType === "PrimitiveStringMultiline" ||
        classType === "ImpactWildcardProcessor") {

      if (params.positivePrompt !== undefined) {
        if (metaTitle.includes("positive") || metaTitle.includes("prompt")) {
          if (!node.inputs) node.inputs = {};
          const field = classType === "PrimitiveStringMultiline" ? "value" :
                       classType === "ImpactWildcardProcessor" ? "wildcard_text" : "text";
          node.inputs[field] = params.positivePrompt;
        }
      }

      if (params.negativePrompt !== undefined) {
        if (metaTitle.includes("negative")) {
          if (!node.inputs) node.inputs = {};
          const field = classType === "PrimitiveStringMultiline" ? "value" : "text";
          node.inputs[field] = params.negativePrompt;
        }
      }
    }

    // Update LoRA strength values
    if (params.loraUpdates && params.loraUpdates[nodeId]) {
      const loraUpdate = params.loraUpdates[nodeId];
      if (!node.inputs) node.inputs = {};
      if (loraUpdate.strengthModel !== undefined) {
        node.inputs.strength_model = loraUpdate.strengthModel;
      }
      if (loraUpdate.strengthClip !== undefined) {
        node.inputs.strength_clip = loraUpdate.strengthClip;
      }
    }

    // Update batch_size
    if (params.batchSize !== undefined && node.inputs?.batch_size !== undefined) {
      node.inputs.batch_size = params.batchSize;
    }

    // Update width
    if (params.width !== undefined && node.inputs?.width !== undefined) {
      node.inputs.width = params.width;
    }

    // Update height
    if (params.height !== undefined && node.inputs?.height !== undefined) {
      node.inputs.height = params.height;
    }
  }

  return updated;
}

async function sendWorkflow(serverUrl: string, workflow: Workflow): Promise<string> {
  const clientId = randomUUID();
  const data = {
    prompt: workflow,
    client_id: clientId,
  };

  const response = await fetch(`${serverUrl}/prompt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Error sending workflow: ${response.statusText}`);
  }

  const result: any = await response.json();
  return result.prompt_id;
}

async function waitForCompletion(serverUrl: string, promptId: string, timeout = 300000): Promise<any> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${serverUrl}/history/${promptId}`);
      const history: any = await response.json();

      if (history[promptId] && history[promptId].outputs) {
        return history[promptId];
      }
    } catch {
      // Ignorovat chyby a zkusit znovu
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error("Timeout waiting for completion");
}

async function downloadResults(
  serverUrl: string,
  promptResult: any,
  originalPath: string,
  outputSuffix: string
): Promise<string[]> {
  const outputs = promptResult.outputs;
  const results: string[] = [];

  for (const nodeOutputs of Object.values(outputs)) {
    const nodeData = nodeOutputs as any;
    if (nodeData.images) {
      for (let i = 0; i < nodeData.images.length; i++) {
        const img = nodeData.images[i];
        const url = `${serverUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(
          img.subfolder || ""
        )}&type=${encodeURIComponent(img.type)}`;

        const response = await fetch(url);
        if (!response.ok) continue;

        const buffer = await response.arrayBuffer();

        // Detect file extension from ComfyUI filename
        const comfyFilename = img.filename;
        const comfyExt = comfyFilename.substring(comfyFilename.lastIndexOf("."));

        let outputPath: string;
        
        // If we have original file (img2img workflow)
        if (originalPath.includes("/") && !originalPath.endsWith("generated")) {
          const dir = originalPath.substring(0, originalPath.lastIndexOf("/"));
          const baseName = basename(originalPath).replace(/\.[^.]+$/, ""); // Remove original extension
          const basePathWithoutExt = `${dir}/${baseName}`;
          
          // Use unique filename to avoid overwriting
          outputPath = getUniqueFilename(basePathWithoutExt, outputSuffix, comfyExt);
        } else {
          // Text2img workflow - use original ComfyUI filename
          const dir = originalPath.endsWith("generated") ? originalPath.replace("/generated", "") : originalPath;
          outputPath = `${dir}/${comfyFilename}`;
        }

        await fs.writeFile(outputPath, new Uint8Array(buffer));
        results.push(outputPath);
      }
    }
  }

  return results;
}

export async function processImages(
  serverUrl: string,
  workflowPath: string,
  imagePaths: string[] | Record<string, string[]>, // Can be array OR map of nodeId -> images
  outputSuffix: string,
  workflowParams?: WorkflowParameters,
  onProgress?: (current: number, total: number) => void,
  outputFolder?: string
): Promise<string[]> {
  // Load workflow
  const workflowContent = await fs.readFile(workflowPath, "utf-8");
  let workflow: Workflow = JSON.parse(workflowContent);

  // Apply workflow parameters if provided
  if (workflowParams) {
    workflow = updateWorkflowParameters(workflow, workflowParams);
  }

  const allResults: string[] = [];

  // Check if we have image map (multiple LoadImage nodes) or simple array
  const isImageMap = !Array.isArray(imagePaths) && typeof imagePaths === 'object';

  if (isImageMap) {
    // Multiple LoadImage nodes
    const imageMap = imagePaths as Record<string, string[]>;
    const nodeIds = Object.keys(imageMap);
    
    // Get first node ID and its images
    const firstNodeId = nodeIds[0];
    const firstNodeImages = imageMap[firstNodeId] || [];
    
    // If first node has multiple images, process them sequentially
    // Other nodes use the same single image for all iterations
    const iterations = Math.max(1, firstNodeImages.length);
    
    for (let i = 0; i < iterations; i++) {
      const uploadedMap: Record<string, string> = {};
      
      // Upload image for first node (iterate through all)
      if (firstNodeImages.length > 0) {
        const imageIndex = Math.min(i, firstNodeImages.length - 1);
        const uploadedFilename = await uploadImage(serverUrl, firstNodeImages[imageIndex]);
        uploadedMap[firstNodeId] = uploadedFilename;
      }
      
      // Upload images for other nodes (same for all iterations)
      for (let j = 1; j < nodeIds.length; j++) {
        const nodeId = nodeIds[j];
        const images = imageMap[nodeId];
        if (images && images.length > 0) {
          const uploadedFilename = await uploadImage(serverUrl, images[0]);
          uploadedMap[nodeId] = uploadedFilename;
        }
      }
      
      // Set all images in workflow
      const imageWorkflow = setWorkflowImages(workflow, uploadedMap);
      
      // Send workflow
      const promptId = await sendWorkflow(serverUrl, imageWorkflow);
      const promptResult = await waitForCompletion(serverUrl, promptId);
      
      // Use current first node image for output naming
      const currentImage = firstNodeImages[Math.min(i, firstNodeImages.length - 1)] || "output";
      const results = await downloadResults(serverUrl, promptResult, currentImage, outputSuffix);
      allResults.push(...results);
      
      if (onProgress) {
        onProgress(i + 1, iterations);
      }
    }
  } else {
    // Single LoadImage or no images
    const imageArray = imagePaths as string[];
    
    if (imageArray.length === 0) {
      // Text2img - no images
      const promptId = await sendWorkflow(serverUrl, workflow);
      const promptResult = await waitForCompletion(serverUrl, promptId);
      
      const results = await downloadResults(
        serverUrl, 
        promptResult, 
        outputFolder ? `${outputFolder}/generated` : "generated", 
        outputSuffix
      );
      allResults.push(...results);
      
      if (onProgress) {
        onProgress(1, 1);
      }
    } else {
      // Single LoadImage - batch processing
      for (let i = 0; i < imageArray.length; i++) {
        const imagePath = imageArray[i];

        // Upload image
        const uploadedFilename = await uploadImage(serverUrl, imagePath);

        // Set image in workflow
        const imageWorkflow = setWorkflowImage(workflow, uploadedFilename);

        // Send workflow
        const promptId = await sendWorkflow(serverUrl, imageWorkflow);

        // Wait for completion
        const promptResult = await waitForCompletion(serverUrl, promptId);

        // Download results
        const results = await downloadResults(serverUrl, promptResult, imagePath, outputSuffix);
        allResults.push(...results);

        // Update progress
        if (onProgress) {
          onProgress(i + 1, imageArray.length);
        }
      }
    }
  }

  return allResults;
}
