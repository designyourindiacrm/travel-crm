import { Button } from "./ui/button";
import { MessageCircle } from "lucide-react";

function normalizeWhatsappNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  return digits;
}

export function WhatsappButton({ phone, message, className }: { phone?: string | null; message: string; className?: string }) {
  if (!phone) return null;

  const normalizedPhone = normalizeWhatsappNumber(phone);
  const href = `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;

  const handleOpen = () => {
    const popup = window.open(href, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = href;
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={`border-green-600 text-green-600 hover:bg-green-50 hover:text-green-700 ${className ?? ""}`}
      onClick={handleOpen}
    >
      <MessageCircle className="mr-2 size-4" />
      WhatsApp
    </Button>
  );
}
