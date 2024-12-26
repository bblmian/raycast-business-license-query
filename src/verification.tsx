import { ActionPanel, Action, Form, List } from "@raycast/api";
import React from "react";

interface VerificationFormProps {
  inputText: string;
  setInputText: (text: string) => void;
}

function VerificationForm({ inputText, setInputText }: VerificationFormProps) {
  return (
    <Form>
      <Form.TextArea
        id="input"
        title="输入企业信息"
        placeholder="请输入企业名称和统一社会信用代码，每行一对，用逗号分隔"
        value={inputText}
        onChange={setInputText}
      />
    </Form>
  );
}

export default function Command() {
  const [isLoading] = React.useState(false);
  const [inputText, setInputText] = React.useState("");

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="工商信息核验"
        actions={
          <ActionPanel>
            <Action.Push
              title="核验"
              target={<VerificationForm inputText={inputText} setInputText={setInputText} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
