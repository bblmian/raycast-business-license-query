import { ActionPanel, Action, Form, List } from "@raycast/api";
import React from "react";

interface QueryFormProps {
  inputText: string;
  setInputText: (text: string) => void;
}

function QueryForm({ inputText, setInputText }: QueryFormProps) {
  return (
    <Form>
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

export default function Command() {
  const [isLoading] = React.useState(false);
  const [inputText, setInputText] = React.useState("");

  return (
    <List isLoading={isLoading}>
      <List.Item
        title="工商信息查询"
        actions={
          <ActionPanel>
            <Action.Push
              title="查询"
              target={<QueryForm inputText={inputText} setInputText={setInputText} />}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
