"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcwIcon } from "@/components/icons";
import { notify as toast } from "@/lib/notify";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";

export function RetryButton({ episodeId }: { episodeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      size="lg"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await api(`/episodes/${episodeId}/retry`, { method: "POST" });
          toast.success("Retrying the episode");
          router.refresh();
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <RotateCcwIcon data-icon="inline-start" />
      )}
      Retry
    </Button>
  );
}
