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
  Clipboard,
  showHUD,
  getSelectedFinderItems,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { processImages, getWorkflows, ensureServerRunning, extractWorkflowParameters, WorkflowParameters } from "./utils/comfyui";
import { homedir } from "os";
import { existsSync } from "fs";

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
  [key: string]: any;
}

interface PromptHistory {
  positive: string[];
  negative: string[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [workflows, setWorkflows] = useState<{ name: string; path: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [finderFiles, setFinderFiles] = useState<string[]>([]);
  const [workflowParams, setWorkflowParams] = useState<WorkflowParameters>({});
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [screenshotFile, setScreenshotFile] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState<string>("");
  const [promptHistory, setPromptHistory] = useState<PromptHistory>({ positive: [], negative: [] });
  const [currentPositive, setCurrentPositive] = useState<string>("");
  const [currentNegative, setCurrentNegative] = useState<string>("");

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
    
    if (positive && positive.trim() && !updated.positive.includes(positive)) {
      updated.positive = [positive, ...updated.positive].slice(0, 20);
    }
    
    if (negative && negative.trim() && !updated.negative.includes(negative)) {
      updated.negative = [negative, ...updated.negative].slice(0, 20);
    }
    
    setPromptHistory(updated);
    await LocalStorage.setItem("prompt_history", JSON.stringify(updated));
  }

  async function detectImageSize(imagePath: string) {
    try {
      const { exec } = require("child_process");
      const { promisify } = require("util");
      const execAsync = promisify(exec);
      
      const { stdout } = await execAsync(`sips -g pixelWidth -g pixelHeight "${imagePath}"`);
      
      const widthMatch = stdout.match(/pixelWidth:\s*(\d+)/);
      const heightMatch = stdout.match(/pixelHeight:\s*(\d+)/);
      
      if (widthMatch && heightMatch) {
        setImageSize(`${widthMatch[1]} × ${heightMatch[1]} px`);
      }
    } catch (error) {
      setImageSize("");
    }
  }

  async function loadScreenshot() {
    try {
      const path = await LocalStorage.getItem<string>("comfyui_screenshot_path");
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
      const imagePaths = items.map(item => item.path);
      if (imagePaths.length > 0) {
        setFinderFiles(imagePaths);
      }
    } catch (error) {
      // No selection
    }
  }

  async function loadWorkflows() {
    try {
      const workflowsPath = preferences.workflowsPath.replace("~", homedir());
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
      const workflowsPath = preferences.workflowsPath.replace("~", homedir());
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
    
    let imagesToProcess: string[] | Record<string, string[]>;
    
    if (loadImageCount === 0) {
      imagesToProcess = [];
    } else if (loadImageCount === 1) {
      if (screenshotFile) {
        imagesToProcess = [screenshotFile];
      } else if (finderFiles.length > 0) {
        imagesToProcess = finderFiles;
      } else {
        const fieldName = `loadimage_${workflowParams.loadImageNodes![0].nodeId}`;
        imagesToProcess = values[fieldName] || [];
      }
    } else {
      // Multiple LoadImage nodes
      const imageMap: Record<string, string[]> = {};
      
      // First LoadImage: can have multiple files OR screenshot
      const firstNode = workflowParams.loadImageNodes![0];
      if (screenshotFile) {
        imageMap[firstNode.nodeId] = [screenshotFile];
      } else {
        const firstFieldName = `loadimage_${firstNode.nodeId}`;
        const firstImages = values[firstFieldName] || [];
        if (firstImages.length > 0) {
          imageMap[firstNode.nodeId] = firstImages;
        }
      }
      
      // Other LoadImage nodes: single file each
      for (let i = 1; i < workflowParams.loadImageNodes!.length; i++) {
        const node = workflowParams.loadImageNodes![i];
        const fieldName = `loadimage_${node.nodeId}`;
        const images = values[fieldName] || [];
        if (images.length > 0) {
          imageMap[node.nodeId] = images;
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

    if (!hasImages && loadImageCount === 0 && (!values.outputFolder || values.outputFolder.length === 0)) {
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
        preferences.comfyuiSwitch
      );

      if (!serverRunning) {
        throw new Error("Server not available");
      }

      toast.title = "Processing...";
      
      const outputFolder = values.outputFolder && values.outputFolder.length > 0 ? values.outputFolder[0] : undefined;
      
      const params: WorkflowParameters = {};
      if (values.positivePrompt !== undefined) params.positivePrompt = values.positivePrompt;
      if (values.negativePrompt !== undefined) params.negativePrompt = values.negativePrompt;
      
      if (values.width && values.width !== String(workflowParams.width)) {
        params.width = parseInt(values.width);
      }
      if (values.height && values.height !== String(workflowParams.height)) {
        params.height = parseInt(values.height);
      }
      if (values.batchSize) params.batchSize = parseInt(values.batchSize);

      await savePromptToHistory(values.positivePrompt, values.negativePrompt);

      const results = await processImages(
        preferences.serverUrl,
        values.workflow,
        imagesToProcess,
        preferences.outputSuffix,
        params,
        (current, total) => {
          if (total > 0) {
            toast.message = `${current}/${total}`;
          }
        },
        outputFolder
      );

      toast.style = Toast.Style.Success;
      toast.title = `✓ Done! ${results.length} file${results.length > 1 ? 's' : ''} processed`;
      toast.message = screenshotFile ? "📁 Saved to ~/Downloads" : "Click to open folder";
      
      toast.primaryAction = {
        title: "Open Folder",
        onAction: async () => {
          if (results.length > 0) {
            const firstResult = results[0];
            const dir = firstResult.substring(0, firstResult.lastIndexOf("/"));
            await open(dir);
          }
        },
      };

      toast.secondaryAction = {
        title: "Copy Paths",
        onAction: async () => {
          await Clipboard.copy(results.join("\n"));
          await showHUD("✓ Paths copied to clipboard");
        },
      };

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
  const fileNames = finderFiles.length > 3 
    ? `${finderFiles.slice(0, 3).map(f => f.split('/').pop()).join(', ')}...`
    : finderFiles.map(f => f.split('/').pop()).join(', ');

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
          text={`📁 ${screenshotFile.split('/').pop()}\n📐 ${imageSize}`}
        />
      )}

      {finderFiles.length > 0 && !screenshotFile && (
        <Form.Description
          title="Selected Files"
          text={`${finderFiles.length} file${finderFiles.length > 1 ? 's' : ''}\n${fileNames}\n📐 ${imageSize}`}
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
          {loadImageCount === 1 && !screenshotFile && finderFiles.length === 0 && (
            <Form.FilePicker
              id={`loadimage_${workflowParams.loadImageNodes![0].nodeId}`}
              title={workflowParams.loadImageNodes![0].title}
              allowMultipleSelection={true}
              canChooseDirectories={false}
              canChooseFiles={true}
            />
          )}

          {loadImageCount > 1 && workflowParams.loadImageNodes!.map((node, index) => (
            <Form.FilePicker
              key={node.nodeId}
              id={`loadimage_${node.nodeId}`}
              title={node.title}
              info={index === 0 ? "Multiple files allowed - will process sequentially" : "Single file only"}
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
      {selectedWorkflow && (workflowParams.positivePrompt !== undefined || 
        workflowParams.negativePrompt !== undefined ||
        workflowParams.width !== undefined ||
        workflowParams.height !== undefined ||
        workflowParams.batchSize !== undefined) && (
        <Form.Separator />
      )}

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
              id="_positiveHistory" 
              title="History"
              onChange={(value) => setCurrentPositive(value)}
            >
              <Form.Dropdown.Item value={workflowParams.positivePrompt || ""} title="↺ Workflow default" />
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
              id="_negativeHistory" 
              title="History"
              onChange={(value) => setCurrentNegative(value)}
            >
              <Form.Dropdown.Item value={workflowParams.negativePrompt || ""} title="↺ Workflow default" />
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

      {selectedWorkflow && workflowParams.batchSize !== undefined && !isNaN(workflowParams.batchSize) && (
        <Form.TextField
          id="batchSize"
          title="Batch Size"
          placeholder={`Default: ${workflowParams.batchSize}`}
          info="Number of images to generate"
        />
      )}

      {selectedWorkflow && workflowParams.width !== undefined && !isNaN(workflowParams.width) && (
        <Form.TextField
          id="width"
          title="Width"
          placeholder={`Default: ${workflowParams.width}px`}
          info="Leave empty to use workflow default"
        />
      )}

      {selectedWorkflow && workflowParams.height !== undefined && !isNaN(workflowParams.height) && (
        <Form.TextField
          id="height"
          title="Height"
          placeholder={`Default: ${workflowParams.height}px`}
          info="Leave empty to use workflow default"
        />
      )}

      {selectedWorkflow && (workflowParams.clipName || workflowParams.vaeName || workflowParams.loraName || 
        workflowParams.unetName || workflowParams.mode) && (
        <>
          <Form.Separator />
          <Form.Description
            title="Model Info"
            text={[
              workflowParams.clipName ? `Checkpoint: ${workflowParams.clipName}` : null,
              workflowParams.vaeName ? `VAE: ${workflowParams.vaeName}` : null,
              workflowParams.loraName ? `LoRA: ${workflowParams.loraName}` : null,
              workflowParams.unetName ? `UNET: ${workflowParams.unetName}` : null,
              workflowParams.mode ? `Sampler: ${workflowParams.mode}` : null,
            ].filter(Boolean).join('\n')}
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
