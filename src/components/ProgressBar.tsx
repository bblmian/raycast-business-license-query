import { Form } from "@raycast/api";
import React from "react";

interface ProgressBarProps {
  progress: number;
  total: number;
  label?: string;
}

export function ProgressBar({ progress, total, label }: ProgressBarProps) {
  const percentage = Math.round((progress / total) * 100);
  const progressText = `${label || "Progress"}: ${percentage}%`;
  const progressBar = "▓".repeat(Math.floor(percentage / 5)) + "░".repeat(20 - Math.floor(percentage / 5));

  return (
    <Form.Description
      title={progressText}
      text={progressBar}
    />
  );
} 