import { redirectToRoleHome } from "@/modules/auth/application/authorization";

export default async function HomePage() {
  await redirectToRoleHome();
}
