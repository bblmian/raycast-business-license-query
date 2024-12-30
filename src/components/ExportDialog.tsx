import { Form, ActionPanel, Action } from "@raycast/api";
import React from "react";

export interface ExportOptions {
  includeRawData: boolean;
  compress: boolean;
}

interface ExportDialogProps {
  onSubmit: (options: ExportOptions) => void;
  onCancel: () => void;
  initialDirectory?: string;
  initialFormats?: string[];
}

export function ExportDialog({ onSubmit, onCancel, initialDirectory, initialFormats = [] }: ExportDialogProps) {
  const [includeRawData, setIncludeRawData] = React.useState(false);
  const [compress, setCompress] = React.useState(false);

  const formatText: string = initialFormats.length > 0 
    ? String(initialFormats.join(", "))
    : "No formats selected";

  const directoryText: string = String(initialDirectory || "Default directory");

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Export"
            onSubmit={() => onSubmit({ includeRawData, compress })}
          />
          <Action
            title="Cancel"
            onAction={onCancel}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Selected Export Formats"
        text={formatText}
      />
      
      <Form.Description
        title="Export Directory"
        text={directoryText}
      />
      
      <Form.Separator />
      
      <Form.Description
        title="Export Options"
        text="Configure additional export options"
      />
      
      <Form.Checkbox
        id="includeRawData"
        label="Include Raw Data"
        value={includeRawData}
        onChange={setIncludeRawData}
      />
      
      <Form.Checkbox
        id="compress"
        label="Compress Files"
        value={compress}
        onChange={setCompress}
      />
    </Form>
  );
} 