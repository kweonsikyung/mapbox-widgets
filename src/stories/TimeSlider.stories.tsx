import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { TimeSlider } from "../components/TimeSlider";

const meta: Meta<typeof TimeSlider> = {
  title: "Animation/TimeSlider",
  component: TimeSlider,
  parameters: {
    docs: {
      description: {
        component:
          "A standalone timeline scrubber for animating route or vessel playback. " +
          "Fully controlled: pass `value` and `onChange` to drive your own state. " +
          "Wire `onChange` to a `MarkerLayer` position or `RouteLayer` timestamp to " +
          "animate ship positions over time.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof TimeSlider>;

const START = new Date("2025-06-01T00:00:00Z");
const END = new Date("2025-06-05T00:00:00Z");

function SliderDemo({ playSpeed = 60 }: { playSpeed?: number }) {
  const [time, setTime] = useState(START);
  const [playing, setPlaying] = useState(false);

  return (
    <div style={{ padding: 40, maxWidth: 480, background: "#F8FAFC", minHeight: 200, borderRadius: 16 }}>
      <TimeSlider
        startTime={START}
        endTime={END}
        value={time}
        onChange={setTime}
        isPlaying={playing}
        onPlayToggle={setPlaying}
        playSpeed={playSpeed}
      />
      <p style={{ marginTop: 16, fontSize: 12, color: "#6B7280", textAlign: "center" }}>
        Simulated ship time: <strong>{time.toISOString().slice(0, 16).replace("T", " ")} UTC</strong>
      </p>
    </div>
  );
}

export const Default: Story = {
  render: () => <SliderDemo playSpeed={60} />,
};

export const FastPlayback: Story = {
  name: "Fast Playback (1 day/sec)",
  render: () => <SliderDemo playSpeed={1440} />,
};

export const CustomFormat: Story = {
  name: "Custom Label Formatter",
  render: () => {
    const [time, setTime] = useState(START);
    const [playing, setPlaying] = useState(false);
    return (
      <div style={{ padding: 40, maxWidth: 480, background: "#F8FAFC", borderRadius: 16 }}>
        <TimeSlider
          startTime={START}
          endTime={END}
          value={time}
          onChange={setTime}
          isPlaying={playing}
          onPlayToggle={setPlaying}
          playSpeed={120}
          formatLabel={(d) =>
            `Day ${Math.floor((d.getTime() - START.getTime()) / 86400000) + 1} — ${d.toUTCString().slice(17, 22)} UTC`
          }
        />
      </div>
    );
  },
};
