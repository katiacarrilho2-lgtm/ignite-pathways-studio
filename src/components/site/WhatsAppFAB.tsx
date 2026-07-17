import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5518996841902";
const MESSAGE = encodeURIComponent("Olá! Vim pelo site da Multplick e gostaria de mais informações.");

export const WhatsAppFAB = () => (
  <a
    href={`https://wa.me/${WHATSAPP_NUMBER}?text=${MESSAGE}`}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Atendimento via WhatsApp"
    className="fixed bottom-6 right-6 z-50 size-14 rounded-full bg-whatsapp text-white grid place-items-center shadow-elegant hover:scale-110 transition-smooth animate-float"
  >
    <MessageCircle className="size-7" />
    <span className="absolute inset-0 rounded-full bg-whatsapp animate-ping opacity-30" />
  </a>
);