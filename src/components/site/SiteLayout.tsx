import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { WhatsAppFAB } from "./WhatsAppFAB";
import { Chatbot } from "./Chatbot";

export const SiteLayout = () => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1 pt-20">
      <Outlet />
    </main>
    <Footer />
    <WhatsAppFAB />
    <Chatbot />
  </div>
);