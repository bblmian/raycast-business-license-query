import { ActionPanel, Action, Form } from "@raycast/api";
import React from "react";

export default function Command() {
  const [isLoading] = React.useState(false);
  const [inputText, setInputText] = React.useState("");

  const handleSubmit = () => {
    // TODO: 实现核验逻辑
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="核验" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
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
