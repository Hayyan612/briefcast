import { toast as manager } from "@/components/ui/toast";

type Options = { description?: string };

/** macOS-style notifications with a sonner-like call shape: notify.success("Saved"). */
export const notify = {
  success: (title: string, opts: Options = {}) =>
    manager.add({ title, description: opts.description, type: "success" }),
  error: (title: string, opts: Options = {}) =>
    manager.add({ title, description: opts.description, type: "error" }),
  info: (title: string, opts: Options = {}) =>
    manager.add({ title, description: opts.description, type: "info" }),
};
