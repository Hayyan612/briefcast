import Link from "next/link";
import { RadioIcon } from "@/components/icons";

import { Badge } from "@/components/ui/badge";

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Badge className="size-8 rounded-full p-0">
        <RadioIcon className="size-4" />
      </Badge>
      <span className="text-mac-title-2 font-semibold tracking-tight">
        Briefcast
      </span>
    </Link>
  );
}
