/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** ComfyUI Server URL - URL address of the ComfyUI server */
  "serverUrl": string,
  /** Home Assistant URL (Internal) - Internal URL for Home Assistant */
  "haUrlInternal": string,
  /** Home Assistant URL (External) - External URL for Home Assistant */
  "haUrlExternal": string,
  /** Home Assistant Token - Authorization token for Home Assistant */
  "haToken"?: string,
  /** ComfyUI Switch Entity - Entity ID of the switch in Home Assistant */
  "comfyuiSwitch": string,
  /** Output Suffix - Suffix for output files */
  "outputSuffix": string,
  /** Workflows Path - Path to the folder with workflow files */
  "workflowsPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-workflows` command */
  export type ManageWorkflows = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `manage-workflows` command */
  export type ManageWorkflows = {}
}

