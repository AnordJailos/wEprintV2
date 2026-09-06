import { redirect } from "next/navigation";

/** Nothing lives at the root of an API. Send humans to the reference. */
export default function Home() {
  redirect("/docs");
}
