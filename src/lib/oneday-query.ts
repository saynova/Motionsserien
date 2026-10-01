import { queryOptions } from "@tanstack/react-query";

import {
  getOnedayApprovedTeams,
  getOnedayInfo,
  getOnedaySettingsAdmin,
  listOnedayRegistrations,
} from "./oneday.functions";

export const onedayInfoQueryOptions = queryOptions({
  queryKey: ["oneday", "info"],
  queryFn: () => getOnedayInfo(),
});

export const onedayTeamsQueryOptions = queryOptions({
  queryKey: ["oneday", "teams"],
  queryFn: () => getOnedayApprovedTeams(),
});

export const onedaySettingsAdminQueryOptions = queryOptions({
  queryKey: ["oneday", "settings", "admin"],
  queryFn: () => getOnedaySettingsAdmin(),
});

export const onedayRegistrationsAdminQueryOptions = queryOptions({
  queryKey: ["oneday", "registrations", "admin"],
  queryFn: () => listOnedayRegistrations(),
});

/** Event date is stored as "YYYY-MM-DDTHH:mm" (Swedish local time) or "YYYY-MM-DD". */
export function formatOnedayDate(value: string) {
  if (!value) return "";
  const [d, t] = value.split("T");
  const date = new Date(`${d}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const day = date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return t ? `${day} · ${t.slice(0, 5)}` : day;
}
