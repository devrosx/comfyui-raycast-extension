import React from "react";
import {
  Grid,
  ActionPanel,
  Action,
  showHUD,
  open,
  showInFinder,
  Icon,
  Clipboard,
} from "@raycast/api";
import { basename } from "path";

interface ResultsViewProps {
  results: string[];
  onBack?: () => void;
}

export default function ResultsView({ results, onBack }: ResultsViewProps) {
  return (
    <Grid
      columns={4}
      aspectRatio="3/2"
      fit={Grid.Fit.Fill}
      navigationTitle={`${results.length} Processed Image${results.length > 1 ? "s" : ""}`}
    >
      {results.map((imagePath, index) => (
        <Grid.Item
          key={imagePath}
          content={imagePath}
          title={basename(imagePath)}
          subtitle={`#${index + 1}`}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Image Actions">
                <Action
                  title="Open in Default App"
                  icon={Icon.Eye}
                  onAction={async () => {
                    await open(imagePath);
                  }}
                />
                <Action
                  title="Reveal in Finder"
                  icon={Icon.Finder}
                  onAction={async () => {
                    await showInFinder(imagePath);
                  }}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action.CopyToClipboard
                  title="Copy Path"
                  content={imagePath}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                <Action
                  title="Copy Image to Clipboard"
                  icon={Icon.Clipboard}
                  onAction={async () => {
                    await Clipboard.copy({ file: imagePath });
                    await showHUD("✓ Image copied to clipboard");
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="Folder Actions">
                <Action
                  title="Open Folder"
                  icon={Icon.Folder}
                  onAction={async () => {
                    const dir = imagePath.substring(
                      0,
                      imagePath.lastIndexOf("/"),
                    );
                    await open(dir);
                  }}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                />
              </ActionPanel.Section>
              {results.length > 1 && (
                <ActionPanel.Section title="Batch Actions">
                  <Action
                    title="Copy All Paths"
                    icon={Icon.Clipboard}
                    onAction={async () => {
                      await Clipboard.copy(results.join("\n"));
                      await showHUD("✓ All paths copied to clipboard");
                    }}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
                  />
                </ActionPanel.Section>
              )}
              {onBack && (
                <ActionPanel.Section>
                  <Action
                    title="Back"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      ))}
      {results.length === 0 && (
        <Grid.EmptyView
          title="No Results"
          description="No images were processed"
          icon={Icon.Image}
        />
      )}
    </Grid>
  );
}
