import { createRoot } from "react-dom/client";
import { MessagesSquare, Sparkles } from "lucide-react";
import { defineComponent, type AppComponentContext } from "@rome-os/app-web-sdk";
import { ChoiceCard, type Choice } from "@/lib/cards";

// The opening "how should we do this?" card. Submits `{ choice: "import" | "answer" }`.
const CHOICES: Choice[] = [
  {
    value: "import",
    title: "Import from ChatGPT",
    desc: "Borrow what ChatGPT already remembers about you.",
    icon: <Sparkles className="size-4" />,
  },
  {
    value: "answer",
    title: "Answer a few questions",
    desc: "Tell me about yourself in a few quick taps.",
    icon: <MessagesSquare className="size-4" />,
  },
];

function IntroChoice({ ctx }: { ctx: AppComponentContext }) {
  return (
    <div className="w-full max-w-lg">
      <ChoiceCard ctx={ctx} choices={CHOICES} outputKey="choice" columns={2} />
    </div>
  );
}

defineComponent("intro-choice", (container, ctx) => {
  const root = createRoot(container);
  root.render(<IntroChoice ctx={ctx} />);
  return () => root.unmount();
});
