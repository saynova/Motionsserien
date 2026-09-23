import { queryOptions } from "@tanstack/react-query";

import { getAdminStatus, getTournament } from "./tournament.functions";
import { getAllShuttleOrders, getBanner, getShuttleOrders, getSupportSettings } from "./extras.functions";
import {
  getRegisteredTeams,
  getRegistrationInfo,
  getSeedBoard,
  listRegistrations,
} from "./registration.functions";
import { listMessages } from "./messages.functions";
import { listDivisionPlayers, listReminders, listTeamContacts } from "./reminders.functions";
import { listSubmitterDetails, listVisits } from "./visitors.functions";
import { listTeamPayments } from "./payments.functions";
import { getMemories } from "./memories.functions";

export const teamPaymentsQueryOptions = queryOptions({
  queryKey: ["team-payments", "admin"],
  queryFn: () => listTeamPayments(),
});

export const memoriesQueryOptions = queryOptions({
  queryKey: ["memories"],
  queryFn: () => getMemories(),
});

export const visitsQueryOptions = queryOptions({
  queryKey: ["visits", "admin"],
  queryFn: () => listVisits(),
});

export const submitterDetailsQueryOptions = queryOptions({
  queryKey: ["submitter-details", "admin"],
  queryFn: () => listSubmitterDetails(),
});

export const tournamentQueryOptions = queryOptions({
  queryKey: ["tournament"],
  queryFn: () => getTournament(),
});

export const adminStatusQueryOptions = queryOptions({
  queryKey: ["admin-status"],
  queryFn: () => getAdminStatus(),
});

export const bannerQueryOptions = queryOptions({
  queryKey: ["banner"],
  queryFn: () => getBanner(),
});

export const supportSettingsQueryOptions = queryOptions({
  queryKey: ["support-settings"],
  queryFn: () => getSupportSettings(),
});

export const shuttleOrdersQueryOptions = queryOptions({
  queryKey: ["shuttle-orders"],
  queryFn: () => getShuttleOrders(),
});

export const adminShuttleOrdersQueryOptions = queryOptions({
  queryKey: ["shuttle-orders", "admin"],
  queryFn: () => getAllShuttleOrders(),
});

export const registrationInfoQueryOptions = queryOptions({
  queryKey: ["registration-info"],
  queryFn: () => getRegistrationInfo(),
});

export const registeredTeamsQueryOptions = queryOptions({
  queryKey: ["registered-teams"],
  queryFn: () => getRegisteredTeams(),
});

export const adminRegistrationsQueryOptions = queryOptions({
  queryKey: ["registrations", "admin"],
  queryFn: () => listRegistrations(),
});

export const seedBoardQueryOptions = queryOptions({
  queryKey: ["seed-board", "admin"],
  queryFn: () => getSeedBoard(),
});

export const messagesQueryOptions = queryOptions({
  queryKey: ["messages", "admin"],
  queryFn: () => listMessages(),
});

export const teamContactsQueryOptions = queryOptions({
  queryKey: ["team-contacts", "admin"],
  queryFn: () => listTeamContacts(),
});

export const remindersQueryOptions = queryOptions({
  queryKey: ["score-reminders", "admin"],
  queryFn: () => listReminders(),
});

export const divisionPlayersQueryOptions = queryOptions({
  queryKey: ["division-players", "admin"],
  queryFn: () => listDivisionPlayers(),
});
