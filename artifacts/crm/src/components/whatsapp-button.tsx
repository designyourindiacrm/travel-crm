import { Button } from "./ui/button";
import { Phone } from "lucide-react";

export function WhatsappButton({ phone, message, className }: { phone?: string | null, message: string, className?: string }) {
  if (!phone) return null;
  
  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const digits = phone.replace(/\D/g, "");
    window.open(`https://wa.me/${digits}?text=${encodeURIComponent(message)}`, "_blank");
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 ${className}`}
      onClick={handleWhatsApp}
    >
      <Phone className="size-4 mr-2" />
      WhatsApp
    </Button>
  );
}