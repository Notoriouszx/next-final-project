import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { getSession } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Activity, Shield, Stethoscope } from "lucide-react";
import { blueButtonClass, greenButtonClass } from "@/lib/control-styles";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");
  const authT = await getTranslations("Auth"); // Load Auth translation keys if available
  const user = await getSession();
  const featureItems = [
    {
      icon: Activity,
      title: t("features.patients.title"),
      text: t("features.patients.text"),
    },
    {
      icon: Stethoscope,
      title: t("features.careTeams.title"),
      text: t("features.careTeams.text"),
    },
    {
      icon: Shield,
      title: t("features.security.title"),
      text: t("features.security.text"),
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar
        user={
          user
            ? {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
              }
            : undefined
        }
      />
      <main className="container flex flex-1 flex-col items-center justify-center gap-12 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Shield className="h-3.5 w-3.5" />
            {t("badge")}
          </div>
          <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            {t("title")}
          </h1>
          <p className="text-pretty text-lg text-muted-foreground md:text-xl">
            {t("subtitle")}
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            {user ? (
              <Button
                asChild
                variant="outline"
                size="lg"
                className={`${blueButtonClass} h-auto cursor-pointer px-5 py-2.5 text-base font-medium`}
              >
                <Link href="/dashboard">{t("getStarted")}</Link>
              </Button>
            ) : (
              <>
                {/* Left Action: Login (Blue Accent Style) */}
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={blueButtonClass}
                >
                  <Link href="/auth/login">{authT("login") ?? "Login"}</Link>
                </Button>

                {/* Right Action: Sign Up (Green Accent Style) */}
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className={greenButtonClass}
                >
                  <Link href="/auth/register">
                    {authT("Learn more") ?? "Sign up"}
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
          {featureItems.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-primary/10 bg-card/80 p-6 text-start shadow-sm backdrop-blur transition hover:border-primary/25"
            >
              <item.icon className="mb-3 h-8 w-8 text-primary" />
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
