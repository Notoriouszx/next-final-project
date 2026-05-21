import { getTranslations, setRequestLocale } from "next-intl/server";
import { Navbar } from "@/components/navbar";
import { getSession } from "@/lib/session";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Activity, Shield, Stethoscope } from "lucide-react";
import { normalButtonClass } from "@/lib/control-styles";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("HomePage");
  const user = await getSession();

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
            HIPAA-minded architecture · Better Auth · Prisma
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
                  className="group relative h-auto cursor-pointer overflow-hidden rounded-full border border-primary px-4 py-2 text-base font-medium text-white transition-all"
                >
                  <Link href="/dashboard">
                    <span className="absolute left-1/2 top-full h-8 w-8 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white transition-transform duration-700 ease-in-out group-hover:scale-[18] dark:bg-gray-950" />
                    <span className="relative z-10 transition-colors duration-500 group-hover:text-gray-950 dark:group-hover:text-white">
                      {t("getStarted")}
                    </span>
                  </Link>
                </Button>
            ) : (
              <>
                <Button
                  asChild
                  className="group relative h-auto cursor-pointer overflow-hidden rounded-full border border-primary px-4 py-2 text-base font-medium text-white transition-all"
                >
                  <Link href="/auth/register">
                    <span className="absolute left-1/2 top-full h-8 w-8 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-white transition-transform duration-700 ease-in-out group-hover:scale-[18] dark:bg-gray-950" />
                    <span className="relative z-10 transition-colors duration-500 group-hover:text-gray-950 dark:group-hover:text-white">
                      {t("getStarted")}
                    </span>
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className={normalButtonClass}>
                  <Link href="/auth/login">{t("learnMore")}</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              icon: Activity,
              title: "Patients",
              text: "Self-service portal, medical records, and granular access sharing.",
            },
            {
              icon: Stethoscope,
              title: "Care teams",
              text: "Doctors and nurses with biometric-gated sessions and audit trails.",
            },
            {
              icon: Shield,
              title: "Security",
              text: "2FA, magic links, email OTP, and external biometric verification APIs.",
            },
          ].map((item) => (
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
