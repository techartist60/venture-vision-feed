import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { VideoProvider } from "./contexts/VideoContext";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Categories from "./pages/Categories";
import Upload from "./pages/Upload";
import IdeaDetail from "./pages/IdeaDetail";
import VideoDetail from "./pages/VideoDetail";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import Search from "./pages/Search";
import Settings from "./pages/Settings";
import Messages from "./pages/Messages";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Idescan from "./pages/Idescan";
import IdescanHistory from "./pages/IdescanHistory";
import IdescanResults from "./pages/IdescanResults";
import IdescanDataSources from "./pages/IdescanDataSources";
import WebScan from "./pages/WebScan";
import Slides from "./pages/Slides";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import IdemarkVerify from "./pages/IdemarkVerify";
import IdemarkRecords from "./pages/IdemarkRecords";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <VideoProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <AppLayout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/categories" element={<Categories />} />
              <Route path="/upload" element={<ProtectedRoute><Upload /></ProtectedRoute>} />
              <Route path="/slides" element={<Slides />} />
              <Route path="/idea/:id" element={<IdeaDetail />} />
              <Route path="/video/:id" element={<VideoDetail />} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<Profile />} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
              <Route path="/groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
              <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/idescan" element={<Idescan />} />
              <Route path="/idescan/history" element={<ProtectedRoute><IdescanHistory /></ProtectedRoute>} />
              <Route path="/idescan/results/:scanId" element={<ProtectedRoute><IdescanResults /></ProtectedRoute>} />
              <Route path="/idescan/sources" element={<IdescanDataSources />} />
              <Route path="/idescan/webscan" element={<WebScan />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/idemark/verify/:idemarkId" element={<IdemarkVerify />} />
              <Route path="/idemark/records" element={<ProtectedRoute><IdemarkRecords /></ProtectedRoute>} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AppLayout>
          </BrowserRouter>
        </VideoProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
