import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Preloader from "@/components/Preloader";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Index from "@/pages/Index";
import Bio from "@/pages/Bio";
import Information from "@/pages/Information";
import Admin from "@/pages/Admin";
import VideoDetail from "@/pages/VideoDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/index" component={Index} />
      <Route path="/bio" component={Bio} />
      <Route path="/information" component={Information} />
      <Route path="/admin" component={Admin} />
      <Route path="/video/:id" component={VideoDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [isLoaded, setIsLoaded] = useState(false);

  const handleLoadComplete = () => {
    setIsLoaded(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        {!isLoaded && <Preloader onLoadComplete={handleLoadComplete} />}
        {isLoaded && <Router />}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
