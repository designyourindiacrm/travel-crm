import { Badge } from "@/components/ui/badge";

export function LeadStatusBadge({ status }: { status: string }) {
  let colorClass = "bg-gray-100 text-gray-800";
  
  switch (status) {
    case "New":
      colorClass = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800";
      break;
    case "Contacted":
      colorClass = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800";
      break;
    case "Interested":
      colorClass = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800";
      break;
    case "Quotation":
      colorClass = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800";
      break;
    case "Follow-up":
      colorClass = "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300 border-pink-200 dark:border-pink-800";
      break;
    case "Converted":
      colorClass = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800";
      break;
    case "Lost":
      colorClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800";
      break;
    case "Cold":
      colorClass = "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300 border-slate-200 dark:border-slate-800";
      break;
  }

  return (
    <Badge variant="outline" className={`${colorClass} font-medium`}>
      {status}
    </Badge>
  );
}