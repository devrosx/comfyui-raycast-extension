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
} from "@raycast/api";
import { useState, useEffect } from "react";
import { processImages, getWorkflows, ensureServerRunning, extractWorkflowParameters, WorkflowParameters } from "./utils/comfyui";
import { homedir } from "os";

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
  images: string[];
  workflow: string;
  positivePrompt?: string;
  negativePrompt?: string;
  batchSize?: string;
  width?: string;
  height?: string;
  outputFolder?: string[];
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [workflows, setWorkflows] = useState<{ name: string; path: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasImages, setHasImages] = useState(false);
  const [finderFiles, setFinderFiles] = useState<string[]>([]);
  const [workflowParams, setWorkflowParams] = useState<WorkflowParameters>({});
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");

  useEffect(() => {
    loadWorkflows();
    loadFinderFiles();
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowParameters(selectedWorkflow);
    }
  }, [selectedWorkflow]);

  async function loadFinderFiles() {
    try {
      const items = await getSelectedFinderItems();
      const imagePaths = items.map(item => item.path);
      if (imagePaths.length > 0) {
        setFinderFiles(imagePaths);
        setHasImages(true);
      }
    } catch (error) {
      // No selection is fine
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
    } catch (error) {
      setWorkflowParams({});
    }
  }

  async function handleSubmit(values: FormValues) {
    let imagesToProcess = finderFiles.length > 0 ? finderFiles : (values.images || []);
    
    if (imagesToProcess.length === 0 && !workflowParams.positivePrompt) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Select at least one image or workflow must have prompt",
      });
      return;
    }

    if (!values.workflow) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Select a workflow",
      });
      return;
    }

    if (imagesToProcess.length === 0 && (!values.outputFolder || values.outputFolder.length === 0)) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Select output folder for generated images",
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
      
      // Build parameters from form
      const params: WorkflowParameters = {};
      if (values.positivePrompt !== undefined) params.positivePrompt = values.positivePrompt;
      if (values.negativePrompt !== undefined) params.negativePrompt = values.negativePrompt;
      if (values.batchSize) params.batchSize = parseInt(values.batchSize);
      if (values.width) params.width = parseInt(values.width);
      if (values.height) params.height = parseInt(values.height);

      if (imagesToProcess.length > 0) {
        toast.message = `0/${imagesToProcess.length}`;
      }

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
      toast.title = `Done! Processed ${results.length} files`;
      toast.message = "Click to open folder";
      
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
          await showHUD("Paths copied");
        },
      };

    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Processing error";
      toast.message = String(error);
    }
  }

  const handleImagesChange = (files: string[]) => {
    if (finderFiles.length === 0) {
      setHasImages(files && files.length > 0);
    }
  };

  const handleWorkflowChange = (path: string) => {
    setSelectedWorkflow(path);
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Process Images" onSubmit={handleSubmit} />
          <Action title="Reload Workflows" onAction={loadWorkflows} shortcut={{ modifiers: ["cmd"], key: "r" }} />
        </ActionPanel>
      }
    >
      {finderFiles.length > 0 ? (
        <Form.Description
          title="Files from Finder"
          text={`Selected: ${finderFiles.length} file${finderFiles.length > 1 ? 's' : ''}`}
        />
      ) : (
        <>
          <Form.FilePicker
            id="images"
            title="Images (optional)"
            allowMultipleSelection={true}
            canChooseDirectories={false}
            canChooseFiles={true}
            onChange={handleImagesChange}
          />

          {!hasImages && (
            <Form.FilePicker
              id="outputFolder"
              title="Output Folder"
              allowMultipleSelection={false}
              canChooseDirectories={true}
              canChooseFiles={false}
            />
          )}
        </>
      )}

      <Form.Dropdown id="workflow" title="Workflow" onChange={handleWorkflowChange}>
        {workflows.map((wf) => (
          <Form.Dropdown.Item key={wf.path} value={wf.path} title={wf.name} />
        ))}
      </Form.Dropdown>

      <Form.Separator />

      {workflowParams.positivePrompt !== undefined && (
        <Form.TextArea
          id="positivePrompt"
          title="Positive Prompt"
          placeholder="Enter prompt..."
          defaultValue={workflowParams.positivePrompt}
        />
      )}

      {workflowParams.negativePrompt !== undefined && (
        <Form.TextArea
          id="negativePrompt"
          title="Negative Prompt"
          placeholder="Enter negative prompt..."
          defaultValue={workflowParams.negativePrompt}
        />
      )}

      {workflowParams.batchSize !== undefined && !isNaN(workflowParams.batchSize) && (
        <Form.TextField
          id="batchSize"
          title="Batch Size"
          placeholder="Number of images to generate"
          defaultValue={String(workflowParams.batchSize)}
        />
      )}

      {workflowParams.width !== undefined && !isNaN(workflowParams.width) && (
        <Form.TextField
          id="width"
          title="Width"
          placeholder="Image width"
          defaultValue={String(workflowParams.width)}
        />
      )}

      {workflowParams.height !== undefined && !isNaN(workflowParams.height) && (
        <Form.TextField
          id="height"
          title="Height"
          placeholder="Image height"
          defaultValue={String(workflowParams.height)}
        />
      )}

      {(workflowParams.clipName || workflowParams.vaeName || workflowParams.loraName || 
        workflowParams.unetName || workflowParams.mode) && (
        <>
          <Form.Separator />
          <Form.Description
            title="Workflow Info"
            text={[
              workflowParams.clipName ? `Checkpoint: ${workflowParams.clipName}` : null,
              workflowParams.vaeName ? `VAE: ${workflowParams.vaeName}` : null,
              workflowParams.loraName ? `LoRA: ${workflowParams.loraName}` : null,
              workflowParams.unetName ? `UNET: ${workflowParams.unetName}` : null,
              workflowParams.mode ? `Mode: ${workflowParams.mode}` : null,
            ].filter(Boolean).join('\n')}
          />
        </>
      )}

      <Form.Description
        title="Info"
        text={`Server: ${preferences.serverUrl}\nOutput suffix: ${preferences.outputSuffix}`}
      />
    </Form>
  );
}
