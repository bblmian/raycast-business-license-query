import { ActionPanel, Action, Form } from "@raycast/api";
import React from "react";

export default function Command() {
  const [isLoading] = React.useState(false);
  const [inputText, setInputText] = React.useState("");

  const handleSubmit = () => {
    // TODO: 实现查询逻辑
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="查询" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="input"
        title="输入企业名称"
        placeholder="请输入企业名称，多个企业可用换行、逗号等符号分隔"
        value={inputText}
        onChange={setInputText}
      />
    </Form>
  );
}
