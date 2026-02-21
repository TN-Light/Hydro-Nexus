import { redirect } from "next/navigation"

/**
 * /ai-assistant redirects to the main dashboard where the
 * Qubit AI assistant is available as a floating widget.
 */
export default function AiAssistantPage() {
  redirect("/dashboard")
}
