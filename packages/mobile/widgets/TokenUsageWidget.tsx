import {
  Button,
  Divider,
  HStack,
  Image,
  RoundedRectangle,
  Spacer,
  Text,
  VStack,
  ZStack,
} from "@expo/ui/swift-ui";
import {
  aspectRatio,
  background,
  buttonStyle,
  containerBackground,
  fixedSize,
  font,
  foregroundStyle,
  frame,
  lineLimit,
  monospacedDigit,
  opacity,
  padding,
  resizable,
  shapes,
} from "@expo/ui/swift-ui/modifiers";
import { createWidget, type WidgetEnvironment } from "expo-widgets";
import {
  type TokenUsageWidgetProps,
  type WidgetProviderId,
  type WidgetProviderUsage,
  type WidgetUsageTone,
  type WidgetUsageWindow,
  type WidgetUsageWindowKey,
} from "../src/widget-usage";

type TokenUsageWidgetConfiguration = {
  showCodex?: boolean;
  showClaude?: boolean;
};

function TokenUsageWidget(
  props: TokenUsageWidgetProps,
  environment: WidgetEnvironment<TokenUsageWidgetConfiguration | undefined>,
) {
  "widget";
  // Expo serializes this function and evaluates it in the widget extension's
  // isolated JavaScriptCore runtime. Everything except Expo UI globals must be
  // declared inside this function; module-scope helpers are not in that runtime.
  const providerLabels = { codex: "Codex", claude: "Claude" } as const;
  const windowLabels = { fiveHour: "5h", sevenDay: "7d" } as const;
  const palette = {
    background: "#090A0D",
    panel: "#11141A",
    track: "#20242C",
    text: "#F7F8FA",
    secondary: "#8F949E",
    tertiary: "#5E646E",
    brand: "#A5A9B1",
    disconnected: "#3D424A",
    fiveHour: "#43E07B",
    sevenDay: "#4E92FF",
    warning: "#FFB340",
    destructive: "#FF5D5D",
  } as const;
  const emptyWidgetProps: TokenUsageWidgetProps = {
    schemaVersion: 1,
    state: "empty",
    updatedAt: 0,
    providers: [
      { id: "codex", status: "unavailable", quotaExhausted: false },
      { id: "claude", status: "unavailable", quotaExhausted: false },
    ],
  };

  function getTone(
    window: WidgetUsageWindow | undefined,
    windowKey: WidgetUsageWindowKey,
    now: number,
  ): WidgetUsageTone {
    const usagePercent = window?.usedPercent;
    if (usagePercent === undefined || !Number.isFinite(usagePercent)) return "muted";
    if (usagePercent < 10) return "success";

    let timePercent: number | undefined;
    if (window?.resetsAt !== undefined) {
      const durationMs = windowKey === "fiveHour" ? 5 * 60 * 60_000 : 7 * 24 * 60 * 60_000;
      const remainingMs = window.resetsAt - now;
      timePercent =
        remainingMs <= 0
          ? 100
          : remainingMs >= durationMs
            ? 0
            : ((durationMs - remainingMs) / durationMs) * 100;
    }
    if (timePercent === undefined || !Number.isFinite(timePercent) || timePercent <= 0) {
      return usagePercent > 98 ? "destructive" : "muted";
    }
    const ratio = usagePercent / timePercent;
    if (ratio < 0.85) return "success";
    if (ratio > 1.15 || usagePercent > 98 || usagePercent - timePercent > 10) {
      return "destructive";
    }
    return "warning";
  }

  function remainingPercent(window: WidgetUsageWindow | undefined): number | undefined {
    if (!window) return undefined;
    return Math.max(0, Math.min(100, Math.round(100 - window.usedPercent)));
  }

  function accentFor(
    window: WidgetUsageWindow | undefined,
    windowKey: WidgetUsageWindowKey,
    now: number,
  ): string {
    const tone = getTone(window, windowKey, now);
    if (tone === "destructive") return palette.destructive;
    if (tone === "warning") return palette.warning;
    if (tone === "muted") return palette.secondary;
    return windowKey === "fiveHour" ? palette.fiveHour : palette.sevenDay;
  }

  function formatReset(resetsAt: number | undefined): string {
    if (resetsAt === undefined) return "Reset time unavailable";
    const value = new Date(resetsAt);
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    return `${month}/${day} ${hours}:${minutes} reset`;
  }

  function logoUri(snapshot: TokenUsageWidgetProps, providerId: WidgetProviderId) {
    return providerId === "codex" ? snapshot.assets?.codexLogo : snapshot.assets?.claudeLogo;
  }

  function ProviderLogo({
    snapshot,
    providerId,
    size,
  }: {
    snapshot: TokenUsageWidgetProps;
    providerId: WidgetProviderId;
    size: number;
  }) {
    const uri = logoUri(snapshot, providerId);
    if (uri) {
      return (
        <Image
          uiImage={uri}
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: "fit" }),
            frame({ width: size, height: size }),
          ]}
        />
      );
    }
    return (
      <Text
        modifiers={[
          font({ size: size * 0.62, weight: "bold", design: "rounded" }),
          foregroundStyle(providerId === "codex" ? palette.text : "#D97757"),
          frame({ width: size, height: size, alignment: "center" }),
        ]}
      >
        {providerId === "codex" ? "C" : "✳"}
      </Text>
    );
  }

  function RomeMark({
    snapshot,
    size,
    opacityValue = 1,
  }: {
    snapshot: TokenUsageWidgetProps;
    size: number;
    opacityValue?: number;
  }) {
    if (snapshot.assets?.romeLogo) {
      return (
        <Image
          uiImage={snapshot.assets.romeLogo}
          modifiers={[
            resizable(),
            aspectRatio({ contentMode: "fit" }),
            frame({ width: size, height: size }),
            opacity(opacityValue),
          ]}
        />
      );
    }
    return (
      <Text
        modifiers={[
          font({ size: 9, weight: "bold", design: "rounded" }),
          foregroundStyle(palette.brand),
        ]}
      >
        ROME
      </Text>
    );
  }

  function snapshotStatusLabel(snapshot: TokenUsageWidgetProps): string | undefined {
    if (snapshot.state === "auth-required") return "SIGN IN";
    if (snapshot.state === "offline") return "OFFLINE";
    return undefined;
  }

  function BrandHeader({ snapshot }: { snapshot: TokenUsageWidgetProps }) {
    const statusLabel = snapshotStatusLabel(snapshot);
    return (
      <HStack spacing={5} modifiers={[frame({ maxWidth: Infinity })]}>
        <RomeMark snapshot={snapshot} size={13} />
        <Text
          modifiers={[
            font({ size: 11, weight: "bold", design: "rounded" }),
            foregroundStyle(palette.brand),
          ]}
        >
          RomeOS
        </Text>
        <Spacer />
        {statusLabel !== undefined && (
          <Text
            modifiers={[
              font({ size: 7, weight: "bold", design: "rounded" }),
              foregroundStyle(palette.warning),
              lineLimit(1),
            ]}
          >
            {statusLabel}
          </Text>
        )}
        <ReloadButton />
      </HStack>
    );
  }

  function ReloadButton() {
    return (
      <Button
        target="reload"
        onPress={() => ({ refreshRequestId: Date.now() })}
        modifiers={[buttonStyle("plain")]}
      >
        <Image
          systemName="arrow.clockwise"
          size={10}
          color={palette.secondary}
          modifiers={[
            frame({ width: 22, height: 22, alignment: "center" }),
            background(palette.panel, shapes.circle()),
          ]}
        />
      </Button>
    );
  }

  function SegmentBar({
    value,
    color,
    compact = false,
    expanded = false,
    disconnected = false,
  }: {
    value: number | undefined;
    color: string;
    compact?: boolean;
    expanded?: boolean;
    disconnected?: boolean;
  }) {
    const count = compact ? 8 : 10;
    const active = disconnected
      ? count
      : value === undefined
        ? 0
        : Math.round((value / 100) * count);
    return (
      <HStack spacing={compact ? 2 : 3}>
        {Array.from({ length: count }, (_, index) => (
          <RoundedRectangle
            key={index}
            cornerRadius={compact ? 1.5 : 2}
            modifiers={[
              frame({ width: compact ? 6 : expanded ? 11 : 9, height: compact ? 4 : 5 }),
              foregroundStyle(
                disconnected ? palette.disconnected : index < active ? color : palette.track,
              ),
            ]}
          />
        ))}
      </HStack>
    );
  }

  function PercentageValue({
    value,
    color,
    size,
  }: {
    value: number | undefined;
    color: string;
    size: number;
  }) {
    const modifiers = [
      font({ size, weight: "bold", design: "rounded" }),
      foregroundStyle(color),
      monospacedDigit(),
      lineLimit(1),
    ];
    return (
      <HStack spacing={0} modifiers={[fixedSize({ horizontal: true, vertical: false })]}>
        <Text modifiers={modifiers}>{value === undefined ? "—" : String(value)}</Text>
        {value !== undefined && <Text modifiers={modifiers}>%</Text>}
      </HStack>
    );
  }

  function QuotaDetail({
    window,
    windowKey,
    now,
    connected = true,
    expanded = false,
  }: {
    window: WidgetUsageWindow | undefined;
    windowKey: WidgetUsageWindowKey;
    now: number;
    connected?: boolean;
    expanded?: boolean;
  }) {
    const remaining = connected ? remainingPercent(window) : undefined;
    const accent = connected ? accentFor(window, windowKey, now) : palette.disconnected;
    return (
      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[frame({ maxWidth: Infinity, alignment: "leading" })]}
      >
        <HStack spacing={5} modifiers={[frame({ maxWidth: Infinity })]}>
          <Text
            modifiers={[font({ size: 10, weight: "semibold" }), foregroundStyle(palette.secondary)]}
          >
            {windowLabels[windowKey]}
          </Text>
          <Spacer />
          <PercentageValue
            value={remaining}
            color={remaining === undefined ? palette.secondary : accent}
            size={14}
          />
        </HStack>
        <SegmentBar
          value={remaining}
          color={accent}
          expanded={expanded}
          disconnected={!connected}
        />
        <Text
          modifiers={[
            font({ size: 8, weight: "medium" }),
            foregroundStyle(palette.tertiary),
            lineLimit(1),
          ]}
        >
          {connected ? formatReset(window?.resetsAt) : "—"}
        </Text>
      </VStack>
    );
  }

  function CompactQuota({
    window,
    windowKey,
    now,
    connected = true,
  }: {
    window: WidgetUsageWindow | undefined;
    windowKey: WidgetUsageWindowKey;
    now: number;
    connected?: boolean;
  }) {
    const remaining = connected ? remainingPercent(window) : undefined;
    const accent = connected ? accentFor(window, windowKey, now) : palette.disconnected;
    return (
      <HStack spacing={5} modifiers={[frame({ maxWidth: Infinity })]}>
        <Text
          modifiers={[
            font({ size: 8, weight: "semibold" }),
            foregroundStyle(palette.secondary),
            frame({ width: 14, alignment: "leading" }),
          ]}
        >
          {windowLabels[windowKey]}
        </Text>
        <SegmentBar value={remaining} color={accent} compact disconnected={!connected} />
        <Spacer />
        <PercentageValue
          value={remaining}
          color={remaining === undefined ? palette.secondary : accent}
          size={10}
        />
      </HStack>
    );
  }

  function ProviderHeader({
    provider,
    snapshot,
    compact = false,
  }: {
    provider: WidgetProviderUsage;
    snapshot: TokenUsageWidgetProps;
    compact?: boolean;
  }) {
    return (
      <HStack spacing={compact ? 5 : 7} modifiers={[frame({ maxWidth: Infinity })]}>
        <ProviderLogo snapshot={snapshot} providerId={provider.id} size={compact ? 12 : 16} />
        <Text
          modifiers={[
            font({ size: compact ? 12 : 16, weight: "bold", design: "rounded" }),
            foregroundStyle(palette.text),
            lineLimit(1),
          ]}
        >
          {providerLabels[provider.id]}
        </Text>
        {provider.status !== "ready" && (
          <Text
            modifiers={[
              font({ size: compact ? 6.5 : 7.5, weight: "semibold" }),
              foregroundStyle(palette.tertiary),
              lineLimit(1),
            ]}
          >
            Not connected
          </Text>
        )}
        <Spacer />
        {provider.quotaExhausted && (
          <Text
            modifiers={[font({ size: 7, weight: "bold" }), foregroundStyle(palette.destructive)]}
          >
            LIMIT
          </Text>
        )}
      </HStack>
    );
  }

  function ProviderDetail({
    provider,
    snapshot,
    now,
  }: {
    provider: WidgetProviderUsage;
    snapshot: TokenUsageWidgetProps;
    now: number;
  }) {
    const connected = provider.status === "ready";
    return (
      <VStack
        alignment="leading"
        spacing={6}
        modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" })]}
      >
        <ProviderHeader provider={provider} snapshot={snapshot} />
        <QuotaDetail
          window={provider.fiveHour}
          windowKey="fiveHour"
          now={now}
          connected={connected}
        />
        <QuotaDetail
          window={provider.sevenDay}
          windowKey="sevenDay"
          now={now}
          connected={connected}
        />
      </VStack>
    );
  }

  function CompactProvider({
    provider,
    snapshot,
    now,
  }: {
    provider: WidgetProviderUsage;
    snapshot: TokenUsageWidgetProps;
    now: number;
  }) {
    const connected = provider.status === "ready";
    return (
      <VStack
        alignment="leading"
        spacing={3}
        modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "center" })]}
      >
        <ProviderHeader provider={provider} snapshot={snapshot} compact />
        <CompactQuota
          window={provider.fiveHour}
          windowKey="fiveHour"
          now={now}
          connected={connected}
        />
        <CompactQuota
          window={provider.sevenDay}
          windowKey="sevenDay"
          now={now}
          connected={connected}
        />
      </VStack>
    );
  }

  function SmallWidget(snapshot: TokenUsageWidgetProps, now: number) {
    const configuration = environment.configuration;
    let selected = snapshot.providers.filter((provider) =>
      provider.id === "codex"
        ? configuration?.showCodex !== false
        : configuration?.showClaude !== false,
    );
    // WidgetKit's boolean editor cannot express "at least one". If both are
    // switched off, keep the widget useful and honor the 1–2 provider contract.
    if (selected.length === 0) selected = snapshot.providers;

    return (
      <ZStack
        alignment="center"
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          containerBackground(palette.background, "widget"),
        ]}
      >
        {selected.length === 1 ? (
          <VStack
            alignment="leading"
            spacing={8}
            modifiers={[
              frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }),
              padding({ all: 12 }),
            ]}
          >
            <BrandHeader snapshot={snapshot} />
            <ProviderHeader provider={selected[0]!} snapshot={snapshot} />
            <VStack
              alignment="leading"
              spacing={10}
              modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "center" })]}
            >
              <QuotaDetail
                window={selected[0]!.fiveHour}
                windowKey="fiveHour"
                now={now}
                connected={selected[0]!.status === "ready"}
                expanded
              />
              <QuotaDetail
                window={selected[0]!.sevenDay}
                windowKey="sevenDay"
                now={now}
                connected={selected[0]!.status === "ready"}
                expanded
              />
            </VStack>
          </VStack>
        ) : (
          <VStack
            alignment="leading"
            spacing={4}
            modifiers={[
              frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }),
              padding({ all: 12 }),
            ]}
          >
            <BrandHeader snapshot={snapshot} />
            <CompactProvider provider={selected[0]!} snapshot={snapshot} now={now} />
            <Divider modifiers={[opacity(0.35)]} />
            <CompactProvider provider={selected[1]!} snapshot={snapshot} now={now} />
          </VStack>
        )}
      </ZStack>
    );
  }

  function MediumWidget(snapshot: TokenUsageWidgetProps, now: number) {
    return (
      <ZStack
        alignment="center"
        modifiers={[
          frame({ maxWidth: Infinity, maxHeight: Infinity }),
          containerBackground(palette.background, "widget"),
        ]}
      >
        <VStack
          alignment="leading"
          spacing={7}
          modifiers={[
            frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }),
            padding({ all: 12 }),
          ]}
        >
          <BrandHeader snapshot={snapshot} />
          <HStack
            alignment="top"
            spacing={12}
            modifiers={[
              frame({ maxWidth: Infinity, maxHeight: Infinity, alignment: "topLeading" }),
            ]}
          >
            <ProviderDetail provider={snapshot.providers[0]} snapshot={snapshot} now={now} />
            <Divider modifiers={[opacity(0.35)]} />
            <ProviderDetail provider={snapshot.providers[1]} snapshot={snapshot} now={now} />
          </HStack>
        </VStack>
      </ZStack>
    );
  }

  const now = environment.date.getTime();
  const safeProps = props?.providers?.length === 2 ? props : emptyWidgetProps;
  return environment.widgetFamily === "systemSmall"
    ? SmallWidget(safeProps, now)
    : MediumWidget(safeProps, now);
}

const TokenUsageSmallWidget = createWidget<
  TokenUsageWidgetProps,
  TokenUsageWidgetConfiguration | undefined
>("TokenUsageWidget", TokenUsageWidget);

export default TokenUsageSmallWidget;
