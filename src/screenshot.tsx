import { closeMainWindow, showHUD, LocalStorage, LaunchType, launchCommand, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";
import { copyFile, access } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { constants } from "fs";

export default async function Command() {
  try {
    await closeMainWindow();
    await new Promise(resolve => setTimeout(resolve, 300));

    // Use AppleScript to capture screenshot
    const script = `
      set tempFolder to POSIX path of (path to temporary items)
      set timestamp to do shell script "date +%s"
      set screenshotFile to tempFolder & "comfyui_screenshot_" & timestamp & ".png"
      
      do shell script "screencapture -i " & quoted form of screenshotFile
      
      try
        do shell script "test -f " & quoted form of screenshotFile
        return screenshotFile
      on error
        return ""
      end try
    `;

    const tempPath = await runAppleScript(script);
    
    if (!tempPath || tempPath.trim() === "") {
      // User cancelled (pressed ESC)
      return;
    }

    // Copy to Downloads
    const timestamp = Date.now();
    const finalPath = join(homedir(), "Downloads", `ComfyUI_Screenshot_${timestamp}.png`);
    
    try {
      await copyFile(tempPath.trim(), finalPath);
      
      // Verify file exists
      await access(finalPath, constants.F_OK);
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to save screenshot",
        message: String(err)
      });
      return;
    }

    // Store path for main command
    await LocalStorage.setItem("comfyui_screenshot_path", finalPath);

    await showHUD("✓ Screenshot captured! Opening ComfyUI Convert...");
    await new Promise(resolve => setTimeout(resolve, 500));

    // Launch main command
    await launchCommand({
      name: "index",
      type: LaunchType.UserInitiated,
    });

  } catch (error: any) {
    // Only show error if it's not a cancellation
    if (!String(error).includes("cancelled") && !String(error).includes("User canceled")) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Screenshot error",
        message: String(error)
      });
    }
  }
}
