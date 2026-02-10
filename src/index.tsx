import React from "react";
import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  getPreferenceValues,
  LocalStorage,
  open,
  showHUD,
  getSelectedFinderItems,
  Icon,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import ResultsView from "./components/ResultsView";
import {
  processImages,
  getWorkflows,
  ensureServerRunning,
  extractWorkflowParameters,
  WorkflowParameters,
  getLoraModels,
  ProcessProgress,
} from "./utils/comfyui";
import { existsSync } from "fs";
import { resolvePath } from "./utils/common";

interface Preferences {
  serverUrl: string;
  haUrlInternal?: string;
  haUrlExternal?: string;
  haToken?: string;
  comfyuiSwitch?: string;
  outputSuffix: string;
  workflowsPath: string;
}

interface FormValues {
  workflow: string;
  positivePrompt?: string;
  negativePrompt?: string;
  batchSize?: string;
  width?: string;
  height?: string;
  outputFolder?: string[];
  [key: string]: string | string[] | undefined;
}

interface PromptHistory {
  positive: string[];
  negative: string[];
  favoritePositive?: string[];
  favoriteNegative?: string[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const { push } = useNavigation();
  const [workflows, setWorkflows] = useState<{ name: string; path: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [finderFiles, setFinderFiles] = useState<string[]>([]);
  const [workflowParams, setWorkflowParams] = useState<WorkflowParameters>({});
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [screenshotFile, setScreenshotFile] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<string>("");
  const [promptHistory, setPromptHistory] = useState<PromptHistory>({
    positive: [],
    negative: [],
    favoritePositive: [],
    favoriteNegative: [],
  });
  const [currentPositive, setCurrentPositive] = useState<string>("");
  const [currentNegative, setCurrentNegative] = useState<string>("");
  const [availableLoras, setAvailableLoras] = useState<string[]>([]);
  const [selectedLoras, setSelectedLoras] = useState<Record<string, string>>(
    {},
  );
  const [loraStrengths, setLoraStrengths] = useState<Record<string, number>>(
    {},
  );

  useEffect(() => {
    loadWorkflows();
    loadFinderFiles();
    loadScreenshot();
    loadPromptHistory();
    // Remove loadLastWorkflow - no default selection
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowParameters(selectedWorkflow);
    }
  }, [selectedWorkflow]);

  useEffect(() => {
    if (screenshotFile) {
      detectImageSize(screenshotFile);
    } else if (finderFiles.length > 0) {
      detectImageSize(finderFiles[0]);
    } else {
      setImageSize("");
    }
  }, [screenshotFile, finderFiles]);

  async function loadPromptHistory() {
    try {
      const stored = await LocalStorage.getItem<string>("prompt_history");
      if (stored) {
        setPromptHistory(JSON.parse(stored));
      }
    } catch (error) {
      // No history
    }
  }

  async function savePromptToHistory(positive?: string, negative?: string) {
    const updated = { ...promptHistory };

    if (positive && positive.trim()) {
      // Remove if already exists (to avoid duplicates)
      updated.positive = updated.positive.filter((p) => p !== positive);
      // Add to beginning
      updated.positive = [positive, ...updated.positive].slice(0, 20);
    }

    if (negative && negative.trim()) {
      // Remove if already exists (to avoid duplicates)
      updated.negative = updated.negative.filter((p) => p !== negative);
      // Add to beginning
      updated.negative = [negative, ...updated.negative].slice(0, 20);
    }

    setPromptHistory(updated);
    await LocalStorage.setItem("prompt_history", JSON.stringify(updated));
  }

  // TODO: Add UI action to toggle favorites
  // async function toggleFavoritePrompt(
  //   prompt: string,
  //   type: "positive" | "negative",
  // ) {
  //   const updated = { ...promptHistory };
  //   const favKey =
  //     type === "positive" ? "favoritePositive" : "favoriteNegative";

  //   if (!updated[favKey]) {
  //     updated[favKey] = [];
  //   }

  //   if (updated[favKey]!.includes(prompt)) {
  //     // Remove from favorites
  //     updated[favKey] = updated[favKey]!.filter((p) => p !== prompt);
  //   } else {
  //     // Add to favorites
  //     updated[favKey] = [prompt, ...updated[favKey]!].slice(0, 10);
  //   }

  //   setPromptHistory(updated);
  //   await LocalStorage.setItem("prompt_history", JSON.stringify(updated));
  // }

  async function detectImageSize(imagePath: string) {
    try {
      // We cannot use child_process in Raycast, so we just try to validate the path
      // and set an empty string on any error (no image size info available)
      const ext = imagePath.substring(imagePath.lastIndexOf(".")).toLowerCase();
      if (
        ![".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tiff", ".webp"].includes(
          ext,
        )
      ) {
        throw new Error("Unsupported image format");
      }
      setImageSize("");
    } catch {
      setImageSize("");
    }
  }

  async function loadScreenshot() {
    try {
      const path = await LocalStorage.getItem<string>(
        "comfyui_screenshot_path",
      );
      if (path) {
        setScreenshotFile(path);
        await LocalStorage.removeItem("comfyui_screenshot_path");

        await showToast({
          style: Toast.Style.Success,
          title: "Screenshot loaded",
          message: "Ready to process",
        });
      }
    } catch (error) {
      // No screenshot
    }
  }

  async function loadFinderFiles() {
    try {
      const items = await getSelectedFinderItems();
      const imagePaths = items.map((item) => item.path);
      if (imagePaths.length > 0) {
        setFinderFiles(imagePaths);
      }
    } catch (error) {
      // No selection
    }
  }

  async function loadWorkflows() {
    try {
      const workflowsPath = resolvePath(preferences.workflowsPath);
      const items = await getWorkflows(workflowsPath);
      setWorkflows(items);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading workflows",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function loadWorkflowParameters(workflowPath: string) {
    try {
      const params = await extractWorkflowParameters(workflowPath);
      setWorkflowParams(params);

      setCurrentPositive(params.positivePrompt || "");
      setCurrentNegative(params.negativePrompt || "");

      // Load LoRA models if workflow has LoRA nodes
      if (params.loraNodes && params.loraNodes.length > 0) {
        try {
          const loras = await getLoraModels(preferences.serverUrl);
          setAvailableLoras(loras);

          // Set current LoRA selections and strengths
          const loraSelections: Record<string, string> = {};
          const loraStrengthValues: Record<string, number> = {};
          params.loraNodes.forEach((loraNode) => {
            loraSelections[loraNode.nodeId] = loraNode.currentLora;
            loraStrengthValues[loraNode.nodeId] = loraNode.strength;
          });
          setSelectedLoras(loraSelections);
          setLoraStrengths(loraStrengthValues);
        } catch (error) {
          setAvailableLoras([]);
        }
      } else {
        setAvailableLoras([]);
        setSelectedLoras({});
        setLoraStrengths({});
      }
    } catch (error) {
      setWorkflowParams({});
    }
  }

  async function openWorkflowInEditor() {
    if (!selectedWorkflow) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No workflow selected",
      });
      return;
    }

    try {
      await open(selectedWorkflow);
      await showHUD("✓ Workflow opened in editor");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open workflow",
        message: String(error),
      });
    }
  }

  async function openWorkflowFolder() {
    try {
      const workflowsPath = resolvePath(preferences.workflowsPath);
      await open(workflowsPath);
      await showHUD("✓ Workflows folder opened");
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to open folder",
        message: String(error),
      });
    }
  }

  async function handleSubmit(values: FormValues) {
    const loadImageCount = workflowParams.loadImageNodes?.length || 0;

    // Validate workflow file exists
    if (!existsSync(values.workflow)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Workflow file not found",
        message: `Path: ${values.workflow}`,
      });
      return;
    }

    let imagesToProcess: string[] | Record<string, string[]>;

    if (loadImageCount === 0) {
      imagesToProcess = [];
    } else if (loadImageCount === 1) {
      if (screenshotFile) {
        imagesToProcess = [screenshotFile];
      } else if (finderFiles.length > 0) {
        imagesToProcess = finderFiles;
      } else {
        const loadImageNodes = workflowParams.loadImageNodes;
        if (loadImageNodes && loadImageNodes.length > 0) {
          const fieldName = `loadimage_${loadImageNodes[0].nodeId}`;
          const fieldValue = values[fieldName];
          imagesToProcess = Array.isArray(fieldValue) ? fieldValue : [];
        } else {
          imagesToProcess = [];
        }
      }
    } else {
      // Multiple LoadImage nodes
      const imageMap: Record<string, string[]> = {};
      const loadImageNodes = workflowParams.loadImageNodes;

      // First LoadImage: can have multiple files OR screenshot
      if (loadImageNodes && loadImageNodes.length > 0) {
        const firstNode = loadImageNodes[0];
        if (screenshotFile) {
          imageMap[firstNode.nodeId] = [screenshotFile];
        } else {
          const firstFieldName = `loadimage_${firstNode.nodeId}`;
          const firstFieldValue = values[firstFieldName];
          const firstImages = Array.isArray(firstFieldValue)
            ? firstFieldValue
            : [];
          if (firstImages.length > 0) {
            imageMap[firstNode.nodeId] = firstImages;
          }
        }

        // Other LoadImage nodes: single file each
        for (let i = 1; i < loadImageNodes.length; i++) {
          const node = loadImageNodes[i];
          const fieldName = `loadimage_${node.nodeId}`;
          const fieldValue = values[fieldName];
          const images = Array.isArray(fieldValue) ? fieldValue : [];
          if (images.length > 0) {
            imageMap[node.nodeId] = images;
          }
        }
      }

      imagesToProcess = imageMap;
    }

    const hasImages = Array.isArray(imagesToProcess)
      ? imagesToProcess.length > 0
      : Object.keys(imagesToProcess).length > 0;

    if (!hasImages && loadImageCount > 0 && !currentPositive) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No input",
        message: "Select images or add prompt",
      });
      return;
    }

    if (!values.workflow) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No workflow",
        message: "Select a workflow first",
      });
      return;
    }

    if (
      !hasImages &&
      loadImageCount === 0 &&
      (!values.outputFolder || values.outputFolder.length === 0)
    ) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No output folder",
        message: "Select where to save generated images",
      });
      return;
    }

    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Checking server...",
    });

    try {
      const serverRunning = await ensureServerRunning(
        preferences.serverUrl,
        preferences.haUrlInternal,
        preferences.haUrlExternal,
        preferences.haToken,
        preferences.comfyuiSwitch,
      );

      if (!serverRunning) {
        throw new Error("Server not available");
      }

      toast.title = "Processing...";

      const outputFolder =
        values.outputFolder && values.outputFolder.length > 0
          ? values.outputFolder[0]
          : undefined;

      const params: WorkflowParameters & {
        loraUpdates?: Record<string, { lora: string; strength?: number }>;
      } = {};
      if (values.positivePrompt !== undefined)
        params.positivePrompt = values.positivePrompt;
      if (values.negativePrompt !== undefined)
        params.negativePrompt = values.negativePrompt;

      if (values.width && values.width !== String(workflowParams.width)) {
        params.width = parseInt(values.width);
      }
      if (values.height && values.height !== String(workflowParams.height)) {
        params.height = parseInt(values.height);
      }
      if (values.batchSize) params.batchSize = parseInt(values.batchSize);
      if (values.seed) params.seed = parseInt(values.seed as string);
      if (values.steps) params.steps = parseInt(values.steps as string);
      if (values.cfg) params.cfg = parseFloat(values.cfg as string);

      // Handle LoRA updates
      if (workflowParams.loraNodes && workflowParams.loraNodes.length > 0) {
        const loraUpdates: Record<
          string,
          { lora: string; strength?: number }
        > = {};
        workflowParams.loraNodes.forEach((loraNode) => {
          const loraFieldName = `lora_${loraNode.nodeId}`;
          const strengthFieldName = `lora_strength_${loraNode.nodeId}`;
          const selectedLora = values[loraFieldName];
          const selectedStrength = values[strengthFieldName];

          const hasLoraChange =
            selectedLora &&
            typeof selectedLora === "string" &&
            selectedLora !== loraNode.currentLora;

          const strengthValue = selectedStrength
            ? parseFloat(selectedStrength as string)
            : loraStrengths[loraNode.nodeId] || loraNode.strength;

          const hasStrengthChange = strengthValue !== loraNode.strength;

          if (hasLoraChange || hasStrengthChange) {
            loraUpdates[loraNode.nodeId] = {
              lora:
                typeof selectedLora === "string"
                  ? selectedLora
                  : loraNode.currentLora,
              strength: strengthValue,
            };
          }
        });
        if (Object.keys(loraUpdates).length > 0) {
          params.loraUpdates = loraUpdates;
        }
      }

      await savePromptToHistory(values.positivePrompt, values.negativePrompt);

      const startTime = Date.now();

      const results = await processImages(
        preferences.serverUrl,
        values.workflow,
        imagesToProcess,
        preferences.outputSuffix,
        params,
        (progress: ProcessProgress) => {
          const elapsed = Math.round((Date.now() - startTime) / 1000);
          const phaseEmoji = {
            upload: "⬆️",
            processing: "⚙️",
            download: "⬇️",
          }[progress.phase];

          const percentage = progress.percentage || 0;
          const progressBar = "█".repeat(Math.floor(percentage / 5)) + "░".repeat(20 - Math.floor(percentage / 5));

          toast.title = `${phaseEmoji} ${progress.message || "Processing"}`;
          toast.message = `${progressBar} ${percentage}% • ${elapsed}s`;
        },
        outputFolder,
      );

      toast.style = Toast.Style.Success;
      toast.title = `✓ Done! ${results.length} file${results.length > 1 ? "s" : ""} processed`;
      toast.message = "Opening gallery...";

      // Show results in Grid view
      if (results.length > 0) {
        push(<ResultsView results={results} />);
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Processing failed";
      toast.message = String(error);
    }
  }

  const handleWorkflowChange = (path: string) => {
    setSelectedWorkflow(path);
  };

  const loadImageCount = workflowParams.loadImageNodes?.length || 0;
  const fileNames =
    finderFiles.length > 3
      ? `${finderFiles
          .slice(0, 3)
          .map((f) => f.split("/").pop())
          .join(", ")}...`
      : finderFiles.map((f) => f.split("/").pop()).join(", ");

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <ActionPanel.Section title="Actions">
            <Action.SubmitForm
              title="Process Images"
              icon={Icon.Wand}
              onSubmit={handleSubmit}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Workflow">
            <Action
              title="Edit Workflow"
              icon={Icon.Code}
              onAction={openWorkflowInEditor}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title="Reload Workflows"
              icon={Icon.ArrowClockwise}
              onAction={loadWorkflows}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
            />
            <Action
              title="Open Workflows Folder"
              icon={Icon.Folder}
              onAction={openWorkflowFolder}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      {/* LEFT COLUMN - Image & Workflow */}
      {screenshotFile && (
        <Form.Description
          title="Screenshot Info"
          text={`📁 ${screenshotFile.split("/").pop()}\n📐 ${imageSize}`}
        />
      )}

      {finderFiles.length > 0 && !screenshotFile && (
        <Form.Description
          title="Selected Files"
          text={`${finderFiles.length} file${finderFiles.length > 1 ? "s" : ""}\n${fileNames}\n📐 ${imageSize}`}
        />
      )}

      <Form.Dropdown
        id="workflow"
        title="Workflow"
        value={selectedWorkflow}
        onChange={handleWorkflowChange}
        info="Cmd+E to edit, Cmd+R to reload"
      >
        <Form.Dropdown.Item value="" title="Select workflow..." />
        {workflows.map((wf) => (
          <Form.Dropdown.Item key={wf.path} value={wf.path} title={wf.name} />
        ))}
      </Form.Dropdown>

      {selectedWorkflow && (
        <>
          <Form.Separator />

          {/* LoadImage inputs - only show if workflow is selected */}
          {loadImageCount === 1 &&
            !screenshotFile &&
            finderFiles.length === 0 && (
              <Form.FilePicker
                id={`loadimage_${workflowParams.loadImageNodes![0].nodeId}`}
                title={workflowParams.loadImageNodes![0].title}
                allowMultipleSelection={true}
                canChooseDirectories={false}
                canChooseFiles={true}
              />
            )}

          {loadImageCount > 1 &&
            workflowParams.loadImageNodes!.map((node, index) => (
              <Form.FilePicker
                key={node.nodeId}
                id={`loadimage_${node.nodeId}`}
                title={node.title}
                info={
                  index === 0
                    ? "Multiple files allowed - will process sequentially"
                    : "Single file only"
                }
                allowMultipleSelection={index === 0}
                canChooseDirectories={false}
                canChooseFiles={true}
              />
            ))}

          {loadImageCount === 0 && (
            <Form.FilePicker
              id="outputFolder"
              title="Output Folder"
              info="Where to save generated images"
              allowMultipleSelection={false}
              canChooseDirectories={true}
              canChooseFiles={false}
            />
          )}
        </>
      )}

      {/* RIGHT COLUMN - Parameters */}
      {selectedWorkflow &&
        (workflowParams.positivePrompt !== undefined ||
          workflowParams.negativePrompt !== undefined ||
          workflowParams.width !== undefined ||
          workflowParams.height !== undefined ||
          workflowParams.batchSize !== undefined) && <Form.Separator />}

      {selectedWorkflow && workflowParams.positivePrompt !== undefined && (
        <>
          <Form.TextArea
            id="positivePrompt"
            title="Positive Prompt"
            placeholder="Enter your prompt..."
            value={currentPositive}
            onChange={setCurrentPositive}
          />
          {promptHistory.positive.length > 0 && (
            <Form.Dropdown
              id="positiveHistory"
              title="History"
              onChange={(value) => setCurrentPositive(value)}
            >
              <Form.Dropdown.Item
                value={workflowParams.positivePrompt || ""}
                title="↺ Prompt"
              />
              {promptHistory.positive.slice(0, 10).map((p, i) => (
                <Form.Dropdown.Item
                  key={i}
                  value={p}
                  title={p.length > 50 ? p.substring(0, 50) + "..." : p}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}

      {selectedWorkflow && workflowParams.negativePrompt !== undefined && (
        <>
          <Form.TextArea
            id="negativePrompt"
            title="Negative Prompt"
            placeholder="What to avoid..."
            value={currentNegative}
            onChange={setCurrentNegative}
          />
          {promptHistory.negative.length > 0 && (
            <Form.Dropdown
              id="negativeHistory"
              title="History"
              onChange={(value) => setCurrentNegative(value)}
            >
              <Form.Dropdown.Item
                value={workflowParams.negativePrompt || ""}
                title="↺ Prompt"
              />
              {promptHistory.negative.slice(0, 10).map((p, i) => (
                <Form.Dropdown.Item
                  key={i}
                  value={p}
                  title={p.length > 50 ? p.substring(0, 50) + "..." : p}
                />
              ))}
            </Form.Dropdown>
          )}
        </>
      )}

      {selectedWorkflow &&
        workflowParams.loraNodes &&
        workflowParams.loraNodes.length > 0 &&
        workflowParams.loraNodes.map((loraNode, index) => (
          <React.Fragment key={loraNode.nodeId}>
            <Form.Dropdown
              id={`lora_${loraNode.nodeId}`}
              title={`LoRA ${index + 1}`}
              value={selectedLoras[loraNode.nodeId] || loraNode.currentLora}
              onChange={(value) => {
                setSelectedLoras((prev) => ({
                  ...prev,
                  [loraNode.nodeId]: value,
                }));
              }}
              info={`Default: ${loraNode.currentLora.split("/").pop()}`}
            >
              <Form.Dropdown.Item
                value={loraNode.currentLora}
                title="↺ Default"
              />
              {availableLoras.map((lora) => (
                <Form.Dropdown.Item
                  key={lora}
                  value={lora}
                  title={lora.split("/").pop() || lora}
                />
              ))}
            </Form.Dropdown>
            <Form.TextField
              id={`lora_strength_${loraNode.nodeId}`}
              title={`LoRA ${index + 1} Strength`}
              placeholder={`Default: ${loraNode.strength}`}
              value={String(
                loraStrengths[loraNode.nodeId] ?? loraNode.strength,
              )}
              onChange={(value) => {
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  setLoraStrengths((prev) => ({
                    ...prev,
                    [loraNode.nodeId]: numValue,
                  }));
                }
              }}
              info="Typical range: 0.0 - 2.0 (0 = disabled, 1 = full strength)"
            />
          </React.Fragment>
        ))}

      {selectedWorkflow &&
        workflowParams.batchSize !== undefined &&
        !isNaN(workflowParams.batchSize) && (
          <Form.TextField
            id="batchSize"
            title="Batch Size"
            placeholder={`Default: ${workflowParams.batchSize}`}
            info="Number of images to generate"
          />
        )}

      {selectedWorkflow &&
        workflowParams.width !== undefined &&
        !isNaN(workflowParams.width) && (
          <Form.TextField
            id="width"
            title="Width"
            placeholder={`Default: ${workflowParams.width}px`}
            info="Leave empty to use workflow default"
          />
        )}

      {selectedWorkflow &&
        workflowParams.height !== undefined &&
        !isNaN(workflowParams.height) && (
          <Form.TextField
            id="height"
            title="Height"
            placeholder={`Default: ${workflowParams.height}px`}
            info="Leave empty to use workflow default"
          />
        )}

      {selectedWorkflow &&
        (workflowParams.clipName ||
          workflowParams.vaeName ||
          workflowParams.loraName ||
          workflowParams.unetName ||
          workflowParams.mode) && (
          <>
            <Form.Separator />
            <Form.Description
              title="Model Info"
              text={[
                workflowParams.clipName
                  ? `Checkpoint: ${workflowParams.clipName}`
                  : null,
                workflowParams.vaeName
                  ? `VAE: ${workflowParams.vaeName}`
                  : null,
                workflowParams.loraName
                  ? `LoRA: ${workflowParams.loraName}`
                  : null,
                workflowParams.unetName
                  ? `UNET: ${workflowParams.unetName}`
                  : null,
                workflowParams.mode ? `Sampler: ${workflowParams.mode}` : null,
              ]
                .filter(Boolean)
                .join("\n")}
            />
          </>
        )}

      <Form.Separator />
      <Form.Description
        title="Server"
        text={`${preferences.serverUrl}\nSuffix: ${preferences.outputSuffix}`}
      />
    </Form>
  );
}
