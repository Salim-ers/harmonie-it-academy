import { redirect } from "next/navigation";

export default async function SecurityRedirect(props: PageProps<"/campus/securite">) {
  const sp = (await props.searchParams) as { mfa?: string };
  redirect(`/campus/compte${sp.mfa ? `?mfa=${encodeURIComponent(sp.mfa)}` : ""}#securite`);
}
