// import { Button } from "@/components/ui/button"

// export default async function Home() {
// return <Button>Click me</Button>
// }


import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard");
}
