import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import CRM from "./pages/CRM";
import Tickets from "./pages/Tickets";
import Employees from "./pages/Employees";
import Reports from "./pages/Reports";
import Messages from "./pages/Messages";
import Inbox from "./pages/Inbox";
import Automation from "./pages/Automation";
import APISettings from "./pages/APISettings";
import AgentPerformance from "./pages/AgentPerformance";
import DebugData from "./pages/DebugData";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";
import QueueManagement from "./pages/QueueManagement";
import QueuePanel from "./pages/QueuePanel";
import AgentChat from "./pages/AgentChat";
import AgentMessages from "./pages/AgentMessages";
import QuickRepliesManagement from "./pages/QuickRepliesManagement";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/unauthorized"} component={Unauthorized} />
      <Route path={"/agent/queues"}>
        <ProtectedRoute>
          <QueuePanel />
        </ProtectedRoute>
      </Route>
      <Route path={"/agent/chat"}>
        <ProtectedRoute>
          <AgentChat />
        </ProtectedRoute>
      </Route>
      <Route path={"/agent/messages"}>
        <ProtectedRoute>
          <AgentMessages />
        </ProtectedRoute>
      </Route>
      <Route path={"/admin/quick-replies"}>
        <AdminRoute>
          <QuickRepliesManagement />
        </AdminRoute>
      </Route>
      <Route path={"/"}>
        <ProtectedRoute>
          <Home />
        </ProtectedRoute>
      </Route>
      <Route path={"/dashboard"}>
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path={"/crm"}>
        <AdminRoute>
          <CRM />
        </AdminRoute>
      </Route>
      <Route path={"/tickets"}>
        <ProtectedRoute>
          <Tickets />
        </ProtectedRoute>
      </Route>
      <Route path={"/employees"}>
        <AdminRoute>
          <Employees />
        </AdminRoute>
      </Route>
      <Route path={"/reports"}>
        <ProtectedRoute>
          <Reports />
        </ProtectedRoute>
      </Route>
      <Route path={"/messages"}>
        <ProtectedRoute>
          <Messages />
        </ProtectedRoute>
      </Route>
      <Route path={"/inbox"}>
        <AdminRoute>
          <Inbox />
        </AdminRoute>
      </Route>
      <Route path={"/automation"}>
        <AdminRoute>
          <Automation />
        </AdminRoute>
      </Route>
      <Route path={"/agent-performance"}>
        <AdminRoute>
          <AgentPerformance />
        </AdminRoute>
      </Route>
      <Route path={"/debug-data"}>
        <AdminRoute>
          <DebugData />
        </AdminRoute>
      </Route>
      <Route path={"/settings/api"}>
        <AdminRoute>
          <APISettings />
        </AdminRoute>
      </Route>
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider
          defaultTheme="light"
          // switchable
        >
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
