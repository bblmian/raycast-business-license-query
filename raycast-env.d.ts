/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** API Key - 百度 API 的 API Key，在百度云控制台获取 */
  "apiKey": string,
  /** Secret Key - 百度 API 的 Secret Key，在百度云控制台获取 */
  "secretKey": string,
  /** 请求间隔 - 两次请求之间的间隔时间（毫秒），建议不小于1000 */
  "requestInterval"?: string,
  /** 最大并发数 - 同时进行的最大请求数量，建议不超过5 */
  "maxConcurrent"?: string,
  /** 批处理数量 - 每批处理的企业数量，建议不超过10 */
  "batchSize"?: string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `business-query` command */
  export type BusinessQuery = ExtensionPreferences & {}
  /** Preferences accessible in the `business-verify` command */
  export type BusinessVerify = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `business-query` command */
  export type BusinessQuery = {}
  /** Arguments passed to the `business-verify` command */
  export type BusinessVerify = {}
}

