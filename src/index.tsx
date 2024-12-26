import { List, ActionPanel, Action } from "@raycast/api";
import React, { useState } from "react";
import QueryCommand from "./query";
import VerificationCommand from "./verification";

export default function Command(): React.ReactElement {
  const [selectedTab, setSelectedTab] = useState<string>("query");

  return (
    <List
      navigationTitle="工商信息查询与核验"
      searchBarPlaceholder="选择功能"
      selectedItemId={selectedTab}
      onSelectionChange={(id) => setSelectedTab(id || "query")}
    >
      <List.Item
        id="query"
        title="工商信息查询"
        subtitle="批量查询企业工商信息"
        actions={
          <ActionPanel>
            <Action.Push title="打开查询" target={<QueryCommand />} />
          </ActionPanel>
        }
      />
      <List.Item
        id="verification"
        title="工商信息核验"
        subtitle="批量核验企业名称与统一社会信用代码"
        actions={
          <ActionPanel>
            <Action.Push title="打开核验" target={<VerificationCommand />} />
          </ActionPanel>
        }
      />
    </List>
  );
}
