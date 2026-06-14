import { BridgeBackLink } from "@/components/bridge/bridge-back-link";
import { SessionConsole } from "@/components/bridge/session-console";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import {
  getLiveSessionForHost,
  getSessionScenesForHost,
  SessionError,
} from "@/server/sessions";

type Props = {
  params: Promise<{ locale: string; sessionId: string }>;
};

export default async function BridgeSessionPage({ params }: Props) {
  const { locale, sessionId } = await params;
  const authSession = await auth();
  const t = await getTranslations("session");
  const tBridge = await getTranslations("bridge");

  if (!authSession?.user?.id) {
    redirect(`/${locale}/bridge/login`);
  }

  try {
    const liveSession = await getLiveSessionForHost(
      sessionId,
      authSession.user.id,
    );
    const scenes = await getSessionScenesForHost(
      sessionId,
      authSession.user.id,
    );

    return (
      <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="space-y-3">
          <BridgeBackLink
            href={`/${locale}/bridge`}
            label={tBridge("backToDashboard")}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
              Master Bridge
            </p>
            <h1 className="text-2xl font-bold">{t("consoleTitle")}</h1>
          </div>
        </header>{" "}
        <SessionConsole
          sessionId={liveSession.id}
          hostId={authSession.user.id}
          roomCode={liveSession.roomCode}
          scenes={scenes}
        />
      </main>
    );
  } catch (error) {
    if (error instanceof SessionError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}
