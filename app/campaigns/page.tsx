import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CampaignsClient } from "./campaigns-client";

export default function CampaignsPage() {
  const key = cookies().get("broadcast_session")?.value;
  const expected = process.env.DEMO_API_KEY || "broadcast_demo_key_001";
  if (!key || key !== expected) redirect("/login");
  return <CampaignsClient />;
}
