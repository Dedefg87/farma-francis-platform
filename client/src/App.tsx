import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AdminRoute } from "./components/AdminRoute";
import Login from "./pages/Login";
import Unauthorized from "./pages/Unauthorized";

// Lazy loading de páginas para melhor performance
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const CRM = lazy(() => import("./pages/CRM"));
const Tickets = lazy(() => import("./pages/Tickets"));
const Employees = lazy(() => import("./pages/Employees"));
const Reports = lazy(() => import("./pages/Reports"));
const Messages = lazy(() => import("./pages/Messages"));
const Inbox = lazy(() => import("./pages/Inbox"));
const Automation = lazy(() => import("./pages/Automation"));
const APISettings = lazy(() => import("./pages/APISettings"));
const AgentPerformance = lazy(() => import("./pages/AgentPerformance"));
const DebugData = lazy(() => import("./pages/DebugData"));
const QueuePanel = lazy(() => import("./pages/QueuePanel"));
const AgentChat = lazy(() => import("./pages/AgentChat"));
const AgentMessages = lazy(() => import("./pages/AgentMessages"));
const QuickRepliesManagement = lazy(
  () => import("./pages/QuickRepliesManagement")
);
const Executions = lazy(() => import("./pages/Executions"));
const BabyShowerCreate = lazy(() => import("./pages/baby-shower/CreateEvent"));
const BabyShowerEventPage = lazy(() => import("./pages/baby-shower/EventPage"));
const BabyShowerManage = lazy(() => import("./pages/baby-shower/ManageEvent"));

// Loading spinner component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Carregando...</p>
      </div>
    </div>
  );
}

// Wrapper para páginas com lazy loading
function LazyPage({
  component: Component,
}: {
  component: React.LazyExoticComponent<React.ComponentType>;
}) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

function Router() {
  return (
    <Switch>
      {/* Rotas públicas */}
      <Route path="/login" component={Login} />
      <Route path="/unauthorized" component={Unauthorized} />

      {/* Rotas protegidas - Agent */}
      <Route path="/agent/queues">
        <ProtectedRoute>
          <LazyPage component={QueuePanel} />
        </ProtectedRoute>
      </Route>
      <Route path="/agent/chat">
        <ProtectedRoute>
          <LazyPage component={AgentChat} />
        </ProtectedRoute>
      </Route>
      <Route path="/agent/messages">
        <ProtectedRoute>
          <LazyPage component={AgentMessages} />
        </ProtectedRoute>
      </Route>

      {/* Rotas admin */}
      <Route path="/admin/quick-replies">
        <AdminRoute>
          <LazyPage component={QuickRepliesManagement} />
        </AdminRoute>
      </Route>

      {/* Rota /executions - NOVA FASE A */}
      <Route path="/executions">
        <AdminRoute>
          <LazyPage component={Executions} />
        </AdminRoute>
      </Route>

      {/* Rotas protegidas - Geral */}
      <Route path="/">
        <ProtectedRoute>
          <LazyPage component={Home} />
        </ProtectedRoute>
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute>
          <LazyPage component={Dashboard} />
        </ProtectedRoute>
      </Route>

      {/* Rotas admin */}
      <Route path="/crm">
        <AdminRoute>
          <LazyPage component={CRM} />
        </AdminRoute>
      </Route>
      <Route path="/employees">
        <AdminRoute>
          <LazyPage component={Employees} />
        </AdminRoute>
      </Route>
      <Route path="/inbox">
        <AdminRoute>
          <LazyPage component={Inbox} />
        </AdminRoute>
      </Route>
      <Route path="/automation">
        <AdminRoute>
          <LazyPage component={Automation} />
        </AdminRoute>
      </Route>
      <Route path="/agent-performance">
        <AdminRoute>
          <LazyPage component={AgentPerformance} />
        </AdminRoute>
      </Route>
      <Route path="/debug-data">
        <AdminRoute>
          <LazyPage component={DebugData} />
        </AdminRoute>
      </Route>
      <Route path="/settings/api">
        <AdminRoute>
          <LazyPage component={APISettings} />
        </AdminRoute>
      </Route>

      {/* Rotas protegidas */}
      <Route path="/tickets">
        <ProtectedRoute>
          <LazyPage component={Tickets} />
        </ProtectedRoute>
      </Route>
      <Route path="/reports">
        <ProtectedRoute>
          <LazyPage component={Reports} />
        </ProtectedRoute>
      </Route>
      <Route path="/messages">
        <ProtectedRoute>
          <LazyPage component={Messages} />
        </ProtectedRoute>
      </Route>

      {/* 404 */}
      <Route path="/baby-shower"><AdminRoute><LazyPage component={BabyShowerCreate} /></AdminRoute></Route><Route path="/baby-shower/manage/:id"><AdminRoute><LazyPage component={BabyShowerManage} /></AdminRoute></Route><Route path="/cha-de-bebe/:code"><LazyPage component={BabyShowerEventPage} /></Route><Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider defaultTheme="light">
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
