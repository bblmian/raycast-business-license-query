import { Form } from "@raycast/api";
import React from "react";

interface DirectoryPickerProps {
  id: string;
  title: string;
  value: string;
  onChange: (value: string) => void;
}

export function DirectoryPicker({ id, title, value, onChange }: DirectoryPickerProps) {
  return (
    <Form.FilePicker
      id={id}
      title={title}
      allowMultipleSelection={false}
      canChooseDirectories={true}
      canChooseFiles={false}
      value={value ? [value] : []}
      onChange={(paths) => {
        onChange(paths[0] || "");
      }}
    />
  );
} 