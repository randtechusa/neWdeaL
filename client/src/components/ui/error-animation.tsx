import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, XCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ErrorAnimationProps {
  error?: {
    title: string;
    description: string;
    type?: "error" | "warning" | "info";
  };
  className?: string;
}

export function ErrorAnimation({ error, className }: ErrorAnimationProps) {
  const Icon = error?.type === "warning" ? AlertTriangle : 
               error?.type === "info" ? AlertCircle : XCircle;

  return (
    <AnimatePresence mode="wait">
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-lg border p-4",
            error.type === "warning" ? "border-yellow-200 bg-yellow-50" :
            error.type === "info" ? "border-blue-200 bg-blue-50" :
            "border-red-200 bg-red-50",
            className
          )}
        >
          <div className="flex items-start gap-3">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Icon className={cn(
                "h-5 w-5",
                error.type === "warning" ? "text-yellow-600" :
                error.type === "info" ? "text-blue-600" :
                "text-red-600"
              )} />
            </motion.div>
            <div className="flex-1">
              <motion.h3
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className={cn(
                  "font-medium",
                  error.type === "warning" ? "text-yellow-900" :
                  error.type === "info" ? "text-blue-900" :
                  "text-red-900"
                )}
              >
                {error.title}
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className={cn(
                  "mt-1 text-sm",
                  error.type === "warning" ? "text-yellow-700" :
                  error.type === "info" ? "text-blue-700" :
                  "text-red-700"
                )}
              >
                {error.description}
              </motion.p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
