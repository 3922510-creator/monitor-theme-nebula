import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm",
        "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_28px_-6px_rgba(34,211,238,0.3),0_0_48px_-12px_rgba(167,139,250,0.35)]",
        className
      )}
      {...props}
    />
  )
}

export { Card }
