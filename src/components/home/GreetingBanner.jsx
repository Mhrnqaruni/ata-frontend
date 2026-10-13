import React from "react";
import PageHeader from "../common/PageHeader";
import { useAuth } from "../../hooks/useAuth";

// The Home page's header: the greeting for the time of day and today's date.
export default function GreetingBanner() {
  const { user } = useAuth();
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const displayName = user?.fullName || user?.full_name || user?.name;
  const firstName = typeof displayName === "string" ? displayName.trim().split(/\s+/)[0] : "";
  const today = now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  return <PageHeader subtitle={today} title={`${greeting}${firstName ? `, ${firstName}` : ""}`} />;
}
