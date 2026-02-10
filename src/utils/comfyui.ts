import { showToast, Toast } from "@raycast/api";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs/promises";
import { createReadStream, existsSync } from "fs";
import { basename } from "path";
import { randomUUID } from "crypto";
import { resolvePath, retry, createTimeoutSignal } from "./common";

// Constants
const SERVER_CHECK_TIMEOUT_MS = 5000;
const SERVER_STARTUP_TIMEOUT_MS = 300000; // 5 minutes
const SERVER_STARTUP_POLL_INTERVAL_MS = 5000;
const COMPLETION_TIMEOUT_MS = 300000; // 5 minutes
const COMPLETION_POLL_INTERVAL_MS = 2000;
const MAX_RETRY_ATTEMPTS = 3;

// Generate unique filename if file already exists
function getUniqueFilename(
  basePath: string,
  suffix: string,
  extension: string,
): string {
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
  inputs?: Record<string, unknown>;
  _meta?: {
    title?: string;
  };
}

interface Workflow {
  [key: string]: WorkflowNode;
}

interface PromptResponse {
  prompt_id: string;
  number: number;
  node_errors?: Record<string, unknown>;
}

interface HistoryOutput {
  images?: Array<{
    filename: string;
    subfolder?: string;
    type: string;
  }>;
}

interface HistoryResult {
  prompt: unknown[];
  outputs: Record<string, HistoryOutput>;
}

interface UploadResponse {
  name: string;
  subfolder?: string;
  type?: string;
}

export async function getWorkflows(
  workflowsPath: string,
): Promise<{ name: string; path: string }[]> {
  const normalizedPath = resolvePath(workflowsPath);
  try {
    const files = await fs.readdir(normalizedPath);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => ({
        name: f,
        path: `${normalizedPath}/${f}`,
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
  } catch (error) {
    return { hasLoadImage: false, hasPromptNode: false };
  }
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
  seed?: number;
  steps?: number;
  cfg?: number;
  samplerName?: string;
  schedulerName?: string;
  loadImageNodes?: Array<{
    nodeId: string;
    title: string;
    inputKey: string;
  }>;
  loraNodes?: Array<{
    nodeId: string;
    loraKey: string;
    currentLora: string;
    strength: number;
  }>;
}

export async function extractWorkflowParameters(
  workflowPath: string,
): Promise<WorkflowParameters> {
  try {
    const content = await fs.readFile(workflowPath, "utf-8");
    const workflow: Workflow = JSON.parse(content);

    const params: WorkflowParameters = {
      loadImageNodes: [],
      loraNodes: [],
    };

    let loadImageIndex = 0;
    for (const [nodeId, node] of Object.entries(workflow)) {
      // Extract LoadImage nodes
      if (node.class_type === "LoadImage" || node.class_type === "LoadImages") {
        const title = node._meta?.title || `Load Image ${loadImageIndex + 1}`;
        const inputKey = node.class_type === "LoadImages" ? "images" : "image";

        params.loadImageNodes!.push({
          nodeId,
          title,
          inputKey,
        });
        loadImageIndex++;
      }
      // Extract prompts
      if (
        node.class_type === "CLIPTextEncode" ||
        node.class_type === "PrimitiveStringMultiline" ||
        node.class_type === "ImpactWildcardProcessor"
      ) {
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

      // Extract KSampler parameters
      if (node.class_type === "KSampler" || node.class_type === "KSamplerAdvanced") {
        if (node.inputs?.seed !== undefined && !isNaN(Number(node.inputs.seed))) {
          params.seed = Number(node.inputs.seed);
        }
        if (node.inputs?.steps !== undefined && !isNaN(Number(node.inputs.steps))) {
          params.steps = Number(node.inputs.steps);
        }
        if (node.inputs?.cfg !== undefined && !isNaN(Number(node.inputs.cfg))) {
          params.cfg = Number(node.inputs.cfg);
        }
        if (node.inputs?.sampler_name && typeof node.inputs.sampler_name === "string") {
          params.samplerName = node.inputs.sampler_name;
        }
        if (node.inputs?.scheduler && typeof node.inputs.scheduler === "string") {
          params.schedulerName = node.inputs.scheduler;
        }
      }

      // Extract batch_size from any node that has it
      if (
        node.inputs?.batch_size !== undefined &&
        !isNaN(Number(node.inputs.batch_size))
      ) {
        params.batchSize = Number(node.inputs.batch_size);
      }

      // Extract width and height from latent/image nodes
      if (
        node.inputs?.width !== undefined &&
        !isNaN(Number(node.inputs.width))
      ) {
        params.width = Number(node.inputs.width);
      }
      if (
        node.inputs?.height !== undefined &&
        !isNaN(Number(node.inputs.height))
      ) {
        params.height = Number(node.inputs.height);
      }

      // Extract LoRA nodes
      if (node.inputs) {
        for (const [key, value] of Object.entries(node.inputs)) {
          if (key.startsWith("lora_") && typeof value === "object" && value !== null) {
            const loraObj = value as Record<string, unknown>;
            if (loraObj.lora && typeof loraObj.lora === "string") {
              params.loraNodes!.push({
                nodeId,
                loraKey: key,
                currentLora: loraObj.lora,
                strength: typeof loraObj.strength === "number" ? loraObj.strength : 1,
              });
            }
          }
        }
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

/**
 * Get list of available LoRA models from ComfyUI server
 */
export async function getLoraModels(serverUrl: string): Promise<string[]> {
  try {
    // Try to get LoRA list from ComfyUI API
    // ComfyUI exposes available models through /object_info endpoint
    const response = await fetch(`${serverUrl}/object_info/LoraLoader`, {
      signal: createTimeoutSignal(SERVER_CHECK_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch LoRA models: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      LoraLoader?: {
        input?: {
          required?: {
            lora_name?: [string[]];
          };
        };
      };
    };

    // Extract LoRA names from object_info
    const loraNames = data?.LoraLoader?.input?.required?.lora_name?.[0];

    if (Array.isArray(loraNames)) {
      return loraNames.sort();
    }

    return [];
  } catch (error) {
    return [];
  }
}

async function checkServerAvailability(serverUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${serverUrl}/system_stats`, {
      method: "GET",
      signal: createTimeoutSignal(SERVER_CHECK_TIMEOUT_MS),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function turnOnServer(
  haUrl?: string,
  haToken?: string,
  switchEntity?: string,
): Promise<boolean> {
  if (!haUrl || !haToken || !switchEntity) {
    return false;
  }

  try {
    const response = await fetch(`${haUrl}/api/services/switch/turn_on`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${haToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        entity_id: switchEntity,
      }),
    });

    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function ensureServerRunning(
  serverUrl: string,
  haUrlInternal?: string,
  haUrlExternal?: string,
  haToken?: string,
  switchEntity?: string,
): Promise<boolean> {
  // Check if server is already running
  if (await checkServerAvailability(serverUrl)) {
    return true;
  }

  // If not running, try to turn it on via Home Assistant
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Server not available",
    message: "Attempting to start server...",
  });

  const waitForServer = async (): Promise<boolean> => {
    const startTime = Date.now();
    while (Date.now() - startTime < SERVER_STARTUP_TIMEOUT_MS) {
      if (await checkServerAvailability(serverUrl)) {
        return true;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, SERVER_STARTUP_POLL_INTERVAL_MS),
      );
    }
    return false;
  };

  // Try internal URL
  if (
    haUrlInternal &&
    (await turnOnServer(haUrlInternal, haToken, switchEntity))
  ) {
    toast.message = "Waiting for server to start...";

    if (await waitForServer()) {
      toast.style = Toast.Style.Success;
      toast.title = "Server is ready";
      return true;
    }
  }

  // Try external URL as fallback
  if (
    haUrlExternal &&
    (await turnOnServer(haUrlExternal, haToken, switchEntity))
  ) {
    toast.message = "Waiting for server to start...";

    if (await waitForServer()) {
      toast.style = Toast.Style.Success;
      toast.title = "Server is ready";
      return true;
    }
  }

  toast.style = Toast.Style.Failure;
  toast.title = "Server not available";
  toast.message = "Check connection and try again";
  return false;
}

async function uploadImage(
  serverUrl: string,
  imagePath: string,
): Promise<string> {
  return retry(
    async () => {
      const formData = new FormData();
      formData.append("image", createReadStream(imagePath));
      formData.append("overwrite", "true");

      const response = await fetch(`${serverUrl}/upload/image`, {
        method: "POST",
        body: formData as never,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = (await response.json()) as UploadResponse;
      return result.name || basename(imagePath);
    },
    {
      maxAttempts: MAX_RETRY_ATTEMPTS,
      delayMs: 1000,
    },
  );
}

function setWorkflowImage(workflow: Workflow, imageFilename: string): Workflow {
  const updated = { ...workflow };

  for (const node of Object.values(updated)) {
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
function setWorkflowImages(
  workflow: Workflow,
  imageMap: Record<string, string>,
): Workflow {
  const updated = { ...workflow };

  for (const [nodeId, imageFilename] of Object.entries(imageMap)) {
    const node = updated[nodeId];
    if (
      node &&
      (node.class_type === "LoadImage" || node.class_type === "LoadImages")
    ) {
      if (!node.inputs) {
        node.inputs = {};
      }
      const inputKey = node.class_type === "LoadImages" ? "images" : "image";
      node.inputs[inputKey] = imageFilename;
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
    seed?: number;
    steps?: number;
    cfg?: number;
    loraUpdates?: Record<string, { lora: string; strength?: number }>;
  },
): Workflow {
  const updated = { ...workflow };

  for (const [nodeId, node] of Object.entries(updated)) {
    const classType = node.class_type || "";
    const metaTitle = (node._meta?.title || "").toLowerCase();

    // Update prompts
    if (
      classType === "CLIPTextEncode" ||
      classType === "PrimitiveStringMultiline" ||
      classType === "ImpactWildcardProcessor"
    ) {
      if (params.positivePrompt !== undefined) {
        if (metaTitle.includes("positive") || metaTitle.includes("prompt")) {
          if (!node.inputs) node.inputs = {};
          const field =
            classType === "PrimitiveStringMultiline"
              ? "value"
              : classType === "ImpactWildcardProcessor"
                ? "wildcard_text"
                : "text";
          node.inputs[field] = params.positivePrompt;
        }
      }

      if (params.negativePrompt !== undefined) {
        if (metaTitle.includes("negative")) {
          if (!node.inputs) node.inputs = {};
          const field =
            classType === "PrimitiveStringMultiline" ? "value" : "text";
          node.inputs[field] = params.negativePrompt;
        }
      }
    }

    // Update batch_size
    if (
      params.batchSize !== undefined &&
      node.inputs?.batch_size !== undefined
    ) {
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

    // Update KSampler parameters
    if (classType === "KSampler" || classType === "KSamplerAdvanced") {
      if (params.seed !== undefined && node.inputs?.seed !== undefined) {
        node.inputs.seed = params.seed;
      }
      if (params.steps !== undefined && node.inputs?.steps !== undefined) {
        node.inputs.steps = params.steps;
      }
      if (params.cfg !== undefined && node.inputs?.cfg !== undefined) {
        node.inputs.cfg = params.cfg;
      }
    }

    // Update LoRA
    if (params.loraUpdates && params.loraUpdates[nodeId]) {
      const loraUpdate = params.loraUpdates[nodeId];
      if (node.inputs) {
        for (const [key, value] of Object.entries(node.inputs)) {
          if (key.startsWith("lora_") && typeof value === "object" && value !== null) {
            const loraObj = value as Record<string, unknown>;
            if (loraObj.lora !== undefined) {
              loraObj.lora = loraUpdate.lora;
              if (loraUpdate.strength !== undefined) {
                loraObj.strength = loraUpdate.strength;
              }
            }
          }
        }
      }
    }
  }

  return updated;
}

async function sendWorkflow(
  serverUrl: string,
  workflow: Workflow,
): Promise<string> {
  return retry(
    async () => {
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
        throw new Error(`Failed to send workflow: ${response.statusText}`);
      }

      const result = (await response.json()) as PromptResponse;

      if (result.node_errors && Object.keys(result.node_errors).length > 0) {
        throw new Error(
          `Workflow has errors: ${JSON.stringify(result.node_errors)}`,
        );
      }

      return result.prompt_id;
    },
    {
      maxAttempts: MAX_RETRY_ATTEMPTS,
      delayMs: 1000,
    },
  );
}

async function waitForCompletion(
  serverUrl: string,
  promptId: string,
  timeout = COMPLETION_TIMEOUT_MS,
): Promise<HistoryResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${serverUrl}/history/${promptId}`, {
        signal: createTimeoutSignal(SERVER_CHECK_TIMEOUT_MS),
      });

      if (!response.ok) {
        throw new Error(`History request failed: ${response.statusText}`);
      }

      const history = (await response.json()) as Record<string, HistoryResult>;

      if (history[promptId] && history[promptId].outputs) {
        return history[promptId];
      }
    } catch (error) {
      // Continue retrying unless it's a timeout
      if (Date.now() - startTime >= timeout) {
        throw new Error(
          `Timeout waiting for completion (prompt ID: ${promptId})`,
        );
      }
    }

    await new Promise((resolve) =>
      setTimeout(resolve, COMPLETION_POLL_INTERVAL_MS),
    );
  }

  throw new Error(`Timeout waiting for completion (prompt ID: ${promptId})`);
}

async function downloadResults(
  serverUrl: string,
  promptResult: HistoryResult,
  originalPath: string,
  outputSuffix: string,
): Promise<string[]> {
  const outputs = promptResult.outputs;
  const results: string[] = [];

  for (const nodeOutputs of Object.values(outputs)) {
    if (nodeOutputs.images) {
      for (const img of nodeOutputs.images) {
        const url = `${serverUrl}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(
          img.subfolder || "",
        )}&type=${encodeURIComponent(img.type)}`;

        const response = await retry(
          async () => {
            const res = await fetch(url, {
              signal: createTimeoutSignal(30000), // 30s timeout for image download
            });
            if (!res.ok) {
              throw new Error(`Failed to download image: ${res.statusText}`);
            }
            return res;
          },
          {
            maxAttempts: MAX_RETRY_ATTEMPTS,
            delayMs: 1000,
          },
        );

        const buffer = await response.arrayBuffer();

        // Detect file extension from ComfyUI filename
        const comfyFilename = img.filename;
        const comfyExt = comfyFilename.substring(
          comfyFilename.lastIndexOf("."),
        );

        let outputPath: string;

        // If we have original file (img2img workflow)
        if (originalPath.includes("/") && !originalPath.endsWith("generated")) {
          const dir = originalPath.substring(0, originalPath.lastIndexOf("/"));
          const baseName = basename(originalPath).replace(/\.[^.]+$/, ""); // Remove original extension
          const basePathWithoutExt = `${dir}/${baseName}`;

          // Use unique filename to avoid overwriting
          outputPath = getUniqueFilename(
            basePathWithoutExt,
            outputSuffix,
            comfyExt,
          );
        } else {
          // Text2img workflow - use original ComfyUI filename
          const dir = originalPath.endsWith("generated")
            ? originalPath.replace("/generated", "")
            : originalPath;
          outputPath = `${dir}/${comfyFilename}`;
        }

        await fs.writeFile(outputPath, new Uint8Array(buffer));
        results.push(outputPath);
      }
    }
  }

  return results;
}

export interface ProcessProgress {
  phase: "upload" | "processing" | "download";
  current: number;
  total: number;
  message?: string;
  percentage?: number;
}

export async function processImages(
  serverUrl: string,
  workflowPath: string,
  imagePaths: string[] | Record<string, string[]>, // Can be array OR map of nodeId -> images
  outputSuffix: string,
  workflowParams?: WorkflowParameters,
  onProgress?: (progress: ProcessProgress) => void,
  outputFolder?: string,
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
  const isImageMap =
    !Array.isArray(imagePaths) && typeof imagePaths === "object";

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

      // Upload phase
      if (onProgress) {
        onProgress({
          phase: "upload",
          current: i + 1,
          total: iterations,
          message: `Uploading image ${i + 1}/${iterations}`,
          percentage: Math.round(((i + 1) / iterations) * 30), // Upload = 0-30%
        });
      }

      // Upload image for first node (iterate through all)
      if (firstNodeImages.length > 0) {
        const imageIndex = Math.min(i, firstNodeImages.length - 1);
        const uploadedFilename = await uploadImage(
          serverUrl,
          firstNodeImages[imageIndex],
        );
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

      // Processing phase
      if (onProgress) {
        onProgress({
          phase: "processing",
          current: i + 1,
          total: iterations,
          message: `Processing ${i + 1}/${iterations}`,
          percentage: 30 + Math.round(((i + 1) / iterations) * 50), // Processing = 30-80%
        });
      }

      // Set all images in workflow
      const imageWorkflow = setWorkflowImages(workflow, uploadedMap);

      // Send workflow
      const promptId = await sendWorkflow(serverUrl, imageWorkflow);
      const promptResult = await waitForCompletion(serverUrl, promptId);

      // Download phase
      if (onProgress) {
        onProgress({
          phase: "download",
          current: i + 1,
          total: iterations,
          message: `Downloading results ${i + 1}/${iterations}`,
          percentage: 80 + Math.round(((i + 1) / iterations) * 20), // Download = 80-100%
        });
      }

      // Use current first node image for output naming
      const currentImage =
        firstNodeImages[Math.min(i, firstNodeImages.length - 1)] || "output";
      const results = await downloadResults(
        serverUrl,
        promptResult,
        currentImage,
        outputSuffix,
      );
      allResults.push(...results);
    }
  } else {
    // Single LoadImage or no images
    const imageArray = imagePaths as string[];

    if (imageArray.length === 0) {
      // Text2img - no images
      if (onProgress) {
        onProgress({
          phase: "processing",
          current: 1,
          total: 1,
          message: "Generating image",
          percentage: 50,
        });
      }

      const promptId = await sendWorkflow(serverUrl, workflow);
      const promptResult = await waitForCompletion(serverUrl, promptId);

      if (onProgress) {
        onProgress({
          phase: "download",
          current: 1,
          total: 1,
          message: "Downloading results",
          percentage: 90,
        });
      }

      const results = await downloadResults(
        serverUrl,
        promptResult,
        outputFolder ? `${outputFolder}/generated` : "generated",
        outputSuffix,
      );
      allResults.push(...results);
    } else {
      // Single LoadImage - batch processing
      for (let i = 0; i < imageArray.length; i++) {
        const imagePath = imageArray[i];

        // Upload phase
        if (onProgress) {
          onProgress({
            phase: "upload",
            current: i + 1,
            total: imageArray.length,
            message: `Uploading ${i + 1}/${imageArray.length}`,
            percentage: Math.round(((i + 1) / imageArray.length) * 30),
          });
        }

        // Upload image
        const uploadedFilename = await uploadImage(serverUrl, imagePath);

        // Processing phase
        if (onProgress) {
          onProgress({
            phase: "processing",
            current: i + 1,
            total: imageArray.length,
            message: `Processing ${i + 1}/${imageArray.length}`,
            percentage: 30 + Math.round(((i + 1) / imageArray.length) * 50),
          });
        }

        // Set image in workflow
        const imageWorkflow = setWorkflowImage(workflow, uploadedFilename);

        // Send workflow
        const promptId = await sendWorkflow(serverUrl, imageWorkflow);

        // Wait for completion
        const promptResult = await waitForCompletion(serverUrl, promptId);

        // Download phase
        if (onProgress) {
          onProgress({
            phase: "download",
            current: i + 1,
            total: imageArray.length,
            message: `Downloading ${i + 1}/${imageArray.length}`,
            percentage: 80 + Math.round(((i + 1) / imageArray.length) * 20),
          });
        }

        // Download results
        const results = await downloadResults(
          serverUrl,
          promptResult,
          imagePath,
          outputSuffix,
        );
        allResults.push(...results);
      }
    }
  }

  return allResults;
}
