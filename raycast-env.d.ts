/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - Your Baidu API Key */
  "apiKey": string,
  /** Secret Key - Your Baidu Secret Key */
  "secretKey": string,
  /** Request Interval (ms) - Interval between API requests in milliseconds */
  "requestInterval": string,
  /** Max Concurrent Requests - Maximum number of concurrent API requests */
  "maxConcurrent": string,
  /** Batch Size - Number of items to process in each batch */
  "batchSize": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `index` command */
  export type Index = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `index` command */
  export type Index = {}
}

