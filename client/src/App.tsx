import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Detector from "./pages/Detector";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import Navigation from "./components/Navigation";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/detector"} component={Detector} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/about"} component={About} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <Router />
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
