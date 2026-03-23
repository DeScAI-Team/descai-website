import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import clsx from "clsx";
import { platformGroups } from "@/data/content";

/**
 * Chunk Styles Showcase
 * 
 * This story demonstrates different border and radius treatments for panel chunks.
 * The appearance changes based on the active theme (Current vs Refresh).
 */

type BorderStyle = "gradient" | "thin" | "none" | "glass";
type ContentVariant = "platform" | "snapshot";

type ChunkWrapperProps = {
  radius: number;
  borderStyle: BorderStyle;
  comingSoon: boolean;
  children: ReactNode;
};

const radiusOptions = [24, 18, 14, 10];

const ChunkWrapper = ({ radius, borderStyle, comingSoon, children }: ChunkWrapperProps) => {
  const innerRadius = Math.max(radius - 4, 4);

  const borderStyles: Record<BorderStyle, string> = {
    gradient: "panel-border",
    thin: "border border-border-panel bg-surface-sidebar shadow-panel",
    none: "bg-surface-sidebar",
    glass: "border border-border bg-surface-sidebar/80 backdrop-blur-sm shadow-panel"
  };

  return (
    <div
      className={clsx("relative w-full", borderStyles[borderStyle])}
      style={{ borderRadius: radius }}
    >
      <div
        className={clsx(
          "relative h-full w-full overflow-hidden border border-border bg-surface-sidebar p-5",
          borderStyle === "gradient" && "panel-inner"
        )}
        style={{ borderRadius: innerRadius }}
      >
        {children}

        {comingSoon && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-surface-base/85 text-center text-sm font-semibold uppercase tracking-[0.3em] text-content-primary">
            Coming Soon
          </div>
        )}
      </div>
    </div>
  );
};

const PlatformMiniGrid = () => (
  <div className="flex flex-col gap-4">
    <div className="text-center">
      <span className="neon-heading text-[0.7rem]">By Platform</span>
      <span className="neon-underline" />
    </div>
    <div className="grid gap-2.5 sm:grid-cols-2">
      {platformGroups.slice(0, 4).map((group) => (
        <div
          key={group.title}
          className="rounded-[10px] border border-border bg-surface-subtle px-3 py-2.5 text-left"
        >
          <div className="text-sm font-semibold uppercase tracking-wide text-accent-highlight">
            {group.title}
          </div>
          <p className="mt-1.5 text-xs leading-snug text-content-muted">
            {(group.items || []).slice(0, 3).map((item) => item.replace(/^>\s*/, "")).join(" · ")}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const SnapshotsMini = () => (
  <div className="flex flex-col items-center gap-3 text-center">
    <div>
      <span className="neon-heading text-[0.7rem]">Snapshots</span>
      <span className="neon-underline" />
    </div>
    <p className="text-sm text-content-muted">
      Access past snapshots and donate for access to our most recent releases.
    </p>
    <button className="inline-flex items-center gap-2 rounded-full border border-border-panel bg-surface-subtle px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-content-primary transition hover:border-accent-primary hover:bg-surface-elevated">
      View snapshots
      <span aria-hidden className="text-content-dim">↗</span>
    </button>
  </div>
);

const meta: Meta<{ borderStyle: BorderStyle; comingSoon: boolean; content: ContentVariant }> = {
  title: "Chunks/Chunk Styles",
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `
## Panel Chunk Styles

This story showcases different border treatments and corner radiuses for panel chunks.
Use the theme switcher to see how each style looks in both Current and Refresh themes.

### Border Styles

| Style | Description |
|-------|-------------|
| Gradient | Colored gradient border with glow (prominent in Current, subtle in Refresh) |
| Thin | Simple 1px border using theme border color |
| None | No visible border, just background |
| Glass | Semi-transparent with backdrop blur |
        `
      }
    }
  },
  argTypes: {
    borderStyle: {
      options: ["gradient", "thin", "none", "glass"],
      control: { type: "radio" },
      description: "Border treatment style"
    },
    comingSoon: {
      control: "boolean",
      description: "Toggle overlay for pre-release states"
    },
    content: {
      options: ["platform", "snapshot"],
      control: { type: "radio" },
      description: "Content to display inside each chunk"
    }
  },
  args: {
    borderStyle: "gradient",
    comingSoon: false,
    content: "platform"
  }
};

export default meta;

type Story = StoryObj<{ borderStyle: BorderStyle; comingSoon: boolean; content: ContentVariant }>;

export const RadiusAndBorders: Story = {
  render: (args) => (
    <div className="min-h-screen bg-surface-base px-6 py-8 text-content-primary">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-lg font-semibold">Radius and Border Lab</h1>
          <p className="text-sm text-content-muted">
            Compare four corner radius options with your selected border style.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {radiusOptions.map((radius, index) => (
            <div key={radius} className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.25em] text-content-subtle">
                Option {index + 1}: {radius}px radius
              </p>
              <ChunkWrapper radius={radius} borderStyle={args.borderStyle} comingSoon={args.comingSoon}>
                {args.content === "platform" ? <PlatformMiniGrid /> : <SnapshotsMini />}
              </ChunkWrapper>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
};

export const ComingSoonOverlay: Story = {
  args: {
    borderStyle: "glass",
    comingSoon: true,
    content: "snapshot"
  },
  render: (args) => (
    <div className="min-h-screen bg-surface-base px-6 py-8 text-content-primary">
      <div className="mx-auto max-w-lg space-y-4">
        <p className="text-center text-xs uppercase tracking-[0.3em] text-content-subtle">
          Preview State
        </p>
        <ChunkWrapper radius={18} borderStyle={args.borderStyle} comingSoon={args.comingSoon}>
          {args.content === "platform" ? <PlatformMiniGrid /> : <SnapshotsMini />}
        </ChunkWrapper>
      </div>
    </div>
  )
};

export const AllBorderStyles: Story = {
  render: () => (
    <div className="min-h-screen bg-surface-base px-6 py-8 text-content-primary">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="space-y-2 text-center">
          <h1 className="text-lg font-semibold">All Border Styles</h1>
          <p className="text-sm text-content-muted">
            Side-by-side comparison of all border treatments.
          </p>
        </header>

        <div className="grid gap-5 md:grid-cols-2">
          {(["gradient", "thin", "none", "glass"] as BorderStyle[]).map((style) => (
            <div key={style} className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.25em] text-content-subtle">
                {style.charAt(0).toUpperCase() + style.slice(1)}
              </p>
              <ChunkWrapper radius={18} borderStyle={style} comingSoon={false}>
                <SnapshotsMini />
              </ChunkWrapper>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
};
