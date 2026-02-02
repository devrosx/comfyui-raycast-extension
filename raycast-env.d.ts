/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** ComfyUI Server URL - URL adresa ComfyUI serveru */
  "serverUrl": string,
  /** Home Assistant URL (Internal) - Interní URL pro Home Assistant */
  "haUrlInternal": string,
  /** Home Assistant URL (External) - Externí URL pro Home Assistant */
  "haUrlExternal": string,
  /** Home Assistant Token - Autorizační token pro Home Assistant */
  "haToken"?: string,
  /** ComfyUI Switch Entity - Entity ID přepínače v Home Assistant */
  "comfyuiSwitch": string,
  /** Output Suffix - Přípona pro výstupní soubory */
  "outputSuffix": string,
  /** Workflows Path - Cesta ke složce s workflow soubory */
  "workflowsPath": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
  /** Preferences accessible in the `screenshot` command */
  export type Screenshot = ExtensionPreferences & {}
  /** Preferences accessible in the `manage-workflows` command */
  export type ManageWorkflows = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
  /** Arguments passed to the `screenshot` command */
  export type Screenshot = {}
  /** Arguments passed to the `manage-workflows` command */
  export type ManageWorkflows = {}
}

