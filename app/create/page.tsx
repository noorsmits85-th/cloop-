import { redirect } from "next/navigation";

export default function LegacyCreateProductRedirectPage() {
  redirect("/my-closet/create");
}
