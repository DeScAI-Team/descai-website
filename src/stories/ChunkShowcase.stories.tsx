import type { Meta, StoryObj } from "@storybook/react-vite";
import type { ReactNode } from "react";
import clsx from "clsx";
import { platformGroups } from "@/data/content";

type BorderStyle = "current" | "narrow" | "none" | "liquidGlass";
type ContentVariant = "platform" | "snapshot";

type ChunkWrapperProps = {
  radius: number;
  borderStyle: BorderStyle;
  comingSoon: boolean;
  children: ReactNode;
};

const radiusOptions = [30, 24, 18, 12];

const ChunkWrapper = ({ radius, borderStyle, comingSoon, children }: ChunkWrapperProps) => {
  const innerRadius = Math.max(radius - 6, 6);

  const baseFrame = "relative w-full shadow-[0_18px_38px_rgba(0,0,0,0.45)]";

  const borderStyles: Record<BorderStyle, string> = {
    current: "bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[4px]",
    narrow: "bg-gradient-to-br from-[#ff44ff] via-[#a14bff] to-[#3f2bff] p-[2px]",
    none: "bg-transparent p-0 shadow-none",
    liquidGlass:
      "bg-white/12 p-[1px] backdrop-blur-[14px] border border-white/10 shadow-[0_15px_45px_rgba(255,255,255,0.18)]"
  };

  return (
    <div
      className={clsx(baseFrame, borderStyles[borderStyle])}
      style={{ borderRadius: radius }}
      aria-label={`${borderStyle} border, radius ${radius}px`}
    >
      <div
        className="relative h-full w-full overflow-hidden border border-white/10 bg-[#060017]/95 p-5"
        style={{ borderRadius: innerRadius }}
      >
        {children}

        {comingSoon && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-black/80 text-center text-sm font-semibold uppercase tracking-[0.35em] text-white">
            Coming Soon
          </div>
        )}
      </div>
    </div>
  );
};

const PlatformMiniGrid = () => (
  <div className="flex flex-col gap-4">
    <div className="text-xs uppercase tracking-[0.35em] text-white/60">By Platform</div>
    <div className="grid gap-3 sm:grid-cols-2">
      {platformGroups.slice(0, 4).map((group) => (
        <div
          key={group.title}
          className="rounded-[12px] border border-white/12 bg-white/5 px-4 py-3 text-left shadow-[inset_0_0_18px_rgba(255,255,255,0.05)]"
        >
          <div className="text-sm font-semibold uppercase tracking-wide text-[#ff9cf5]">{group.title}</div>
          <p className="mt-2 text-xs leading-snug text-white/70">
            {(group.items || []).slice(0, 3).map((item) => item.replace(/^>\s*/, "")).join(" · ")}
          </p>
        </div>
      ))}
    </div>
  </div>
);

const SnapshotsMini = () => (
  <div className="flex flex-col items-start gap-3 text-left">
    <div className="text-xs uppercase tracking-[0.35em] text-white/60">Snapshots</div>
    <p className="text-sm text-white/80">
      Access past snapshots and donate for access to our most recent releases.
    </p>
    <button className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white transition hover:border-white/35 hover:bg-white/10">
      View snapshots
      <span aria-hidden className="text-white/60">
        ↗
      </span>
    </button>
  </div>
);

const meta: Meta<{ borderStyle: BorderStyle; comingSoon: boolean; content: ContentVariant }> = {
  title: "Chunks/Chunk Styles",
  parameters: {
    layout: "fullscreen",
    backgrounds: {
      default: "midnight",
      values: [
        { name: "midnight", value: "#040516" },
        { name: "glass", value: "linear-gradient(180deg, #05001a 0%, #0c0c25 100%)" }
      ]
    }
  },
  argTypes: {
    borderStyle: {
      options: ["current", "narrow", "none", "liquidGlass"],
      control: { type: "radio" },
      description:
        "Switch between current border, 50% narrower, no border, or liquid-glass halo that lets the background show through."
    },
    comingSoon: {
      control: "boolean",
      description: "Toggle a ~80% opacity overlay for pre-release states."
    },
    content: {
      options: ["platform", "snapshot"],
      control: { type: "radio" },
      description: "Choose which chunk content to preview inside each frame."
    }
  },
  args: {
    borderStyle: "current",
    comingSoon: false,
    content: "platform"
  }
};

export default meta;

type Story = StoryObj<{ borderStyle: BorderStyle; comingSoon: boolean; content: ContentVariant }>;

export const RadiusAndBorders: Story = {
  render: (args) => (
    <div className="min-h-screen bg-midnight px-5 py-8 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="space-y-2 text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-white/60">Radius and Border Lab</p>
          <p className="text-sm text-white/70">
            Side-by-side comparison of four radiuses from largest to smallest with selectable border and overlay styles.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-2">
          {radiusOptions.map((radius, index) => (
            <div key={radius} className="flex flex-col gap-2">
              <p className="text-xs uppercase tracking-[0.3em] text-white/55">
                Option {index + 1}: Radius {radius}px
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
    borderStyle: "liquidGlass",
    comingSoon: true,
    content: "snapshot"
  },
  render: (args) => (
    <div className="min-h-screen bg-midnight px-5 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-4">
        <p className="text-xs uppercase tracking-[0.35em] text-white/60 text-center">Preview State</p>
        <ChunkWrapper radius={24} borderStyle={args.borderStyle} comingSoon={args.comingSoon}>
          {args.content === "platform" ? <PlatformMiniGrid /> : <SnapshotsMini />}
        </ChunkWrapper>
      </div>
    </div>
  )
};
