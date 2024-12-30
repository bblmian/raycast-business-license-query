import { Form } from "@raycast/api";
import React from "react";

interface ExcelFilePickerProps {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
}

export function ExcelFilePicker({ id, title, value, onChange }: ExcelFilePickerProps) {
  const paths = value ? [value] : [];

  return (
    <Form.FilePicker
      id={id}
      title={title}
      allowMultipleSelection={false}
      canChooseDirectories={false}
      canChooseFiles={true}
      value={paths}
      onChange={(newPaths) => {
        if (newPaths.length > 0) {
          onChange(newPaths[0]);
        }
      }}
    />
  );
} 