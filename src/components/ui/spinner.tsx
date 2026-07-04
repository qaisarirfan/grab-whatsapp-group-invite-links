import { cn } from "@/lib/utils"
// Deep import avoids pulling the whole lucide-react icon set into the bundle (see Actions.tsx).
import Loader2Icon from "lucide-react/dist/esm/icons/loader-2.mjs"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
