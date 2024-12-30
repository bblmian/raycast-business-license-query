import { List, ActionPanel, Action, showToast, Toast, getPreferenceValues, openExtensionPreferences, Icon } from "@raycast/api";
import React, { useState } from "react";
import { QueryView, VerifyView } from "./views";

interface Preferences {
  apiKey: string;
  secretKey: string;
}

export default function Command() {
  const [selectedTab, setSelectedTab] = useState<string>("query");
  const preferences = getPreferenceValues<Preferences>();

  // Check if API credentials are configured
  if (!preferences.apiKey || !preferences.secretKey) {
    return (
      <List>
        <List.EmptyView
          title="API Credentials Not Configured"
          description="Please configure your API credentials in the extension preferences."
          icon={Icon.Key}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={openExtensionPreferences}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List
      navigationTitle="Business Info Search"
      searchBarPlaceholder="Select a function..."
      selectedItemId={selectedTab}
      onSelectionChange={id => id && setSelectedTab(id)}
    >
      <List.Item
        id="query"
        title="Query Business Info"
        subtitle="Search for business information"
        icon={Icon.MagnifyingGlass}
        accessories={[{ icon: Icon.ChevronRight }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Query View"
              target={<QueryView />}
              icon={Icon.MagnifyingGlass}
            />
          </ActionPanel>
        }
      />
      <List.Item
        id="verify"
        title="Verify Business Info"
        subtitle="Verify business license information"
        icon={Icon.CheckCircle}
        accessories={[{ icon: Icon.ChevronRight }]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Open Verify View"
              target={<VerifyView />}
              icon={Icon.CheckCircle}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
