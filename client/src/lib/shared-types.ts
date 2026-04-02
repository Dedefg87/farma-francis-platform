import { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '../../../server/routers';

// DashboardStats - getStats
export type DashboardStatsOutput = inferRouterOutputs<AppRouter>['dashboardStats']['getStats'];

// AgentStats - getAgentStats
export type AgentStatsOutput = inferRouterOutputs<AppRouter>['dashboardStats']['getAgentStats'];

// ContactsByHour - getContactsByHour
export type ContactsByHourOutput = inferRouterOutputs<AppRouter>['dashboardStats']['getContactsByHour'];

// ConversationsByChannel - getConversationsByChannel
export type ConversationsByChannelOutput = inferRouterOutputs<AppRouter>['dashboardStats']['getConversationsByChannel'];

// ConversationsByStatus - getConversationsByStatus
export type ConversationsByStatusOutput = inferRouterOutputs<AppRouter>['dashboardStats']['getConversationsByStatus'];

// Agents - routers-agents (se houver endpoints usados no frontend)
export type AgentsOutput = inferRouterOutputs<AppRouter>['agents']['getAgents'];

// Customers - routers-customers
export type CustomersOutput = inferRouterOutputs<AppRouter>['customers']['getCustomers'];

// Conversations - routers-conversations
export type ConversationsOutput = inferRouterOutputs<AppRouter>['conversations']['getConversations'];
