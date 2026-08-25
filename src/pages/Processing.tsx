import { useState, useEffect } from "react";
import type { Page } from "../App";

interface Props {
  navigate: (p: Page) => void;
}

const steps = [
  { label: "Upload Complete", icon: "☁", desc: "File uploaded to secure servers" },
  { label: "Audio Extraction", icon: "🎵", desc: "Extracting audio track from video" },
  { label: "Transcription", icon: "📝", desc: "Converting speech to text with AI" },
  { label: "AI Analysis", icon: "🧠", desc: "Identifying topics, hooks, and quotes" },
  { label: "Content Generation", icon: "✨", desc: "Creating platform-specific content" },
  { label: "Completed", icon: "🎉", desc: "Your content is ready to review" },
];

export default function Processing({ navigate }: Props) {
  const [currentStep, setCurrentStep] = useState(2);
  const [progress, setProgress] = useState(38);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 0.5;
      });
    }, 200);

    const stepInterval = setInterval(() => {
      setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
    }, 4000);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, []);

  const done = progress >= 100;

  return (
    <div className="max-w-2xl mx-auto py-8 animate-slide-in">
      <div className="text-center mb-10">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] flex items-center justify-center text-3xl mx-auto mb-5 animate-pulse-ring">
          {done ? "🎉" : "⚙"}
        </div>
        <h2 className="text-2xl font-extrabold text-[#111827] mb-2">
          {done ? "Processing Complete!" : "Processing Your Content"}
        </h2>
        <p className="text-[#6B7280] text-sm">
          {done
            ? "Your content is ready. 31 pieces generated across 6 platforms."
            : "Founder Story EP42.mp4 · Estimated 4 min 30 sec remaining"}
        </p>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-[#111827]">Overall Progress</span>
          <span className="text-sm font-bold text-[#6D5EF5]">{Math.round(progress)}%</span>
        </div>
        <div className="h-3 bg-[#F3F4F6] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(to right, #6D5EF5, #3ECFCE)",
            }}
          />
        </div>
      </div>

      {/* Pipeline steps */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] divide-y divide-[#F3F4F6]">
        {steps.map((step, i) => {
          const isDone = i < currentStep;
          const isActive = i === currentStep;
          const isPending = i > currentStep;

          return (
            <div key={step.label} className="flex items-center gap-4 p-5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 transition-all ${
                  isDone
                    ? "bg-[#D1FAE5]"
                    : isActive
                    ? "bg-gradient-to-br from-[#6D5EF5] to-[#3ECFCE] animate-pulse-ring"
                    : "bg-[#F3F4F6]"
                }`}
              >
                {isDone ? "✓" : step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${
                    isDone ? "text-[#059669]" : isActive ? "text-[#6D5EF5]" : "text-[#9CA3AF]"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">{step.desc}</p>
              </div>
              <div className="flex-shrink-0">
                {isDone && <span className="text-[#059669] text-sm font-bold">Done</span>}
                {isActive && (
                  <span className="text-[#6D5EF5] text-xs font-medium bg-[#EDE9FE] px-2 py-1 rounded-full">
                    In Progress
                  </span>
                )}
                {isPending && <span className="text-[#D1D5DB] text-xs">Waiting</span>}
              </div>
            </div>
          );
        })}
      </div>

      {done && (
        <button
          onClick={() => navigate("project-details")}
          className="w-full mt-6 py-4 bg-gradient-to-r from-[#6D5EF5] to-[#5a4de0] text-white font-bold rounded-2xl hover:opacity-90 transition-opacity shadow-lg shadow-purple-200 animate-slide-in"
        >
          View Generated Content →
        </button>
      )}
    </div>
  );
}
