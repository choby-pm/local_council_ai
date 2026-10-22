import type { Metadata } from "next";
import { DemoExperience } from "./demo-experience";

export const metadata: Metadata = { title: "데모 체험 | 지방의회 AI비서" };

export default function DemoPage() {
  return <DemoExperience />;
}
