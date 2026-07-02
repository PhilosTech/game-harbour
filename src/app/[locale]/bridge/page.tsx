import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { AccountButton } from "@/components/bridge/account-button";
import { DuplicateGameButton } from "@/components/bridge/duplicate-game-button";
import { PublishGameButton } from "@/components/bridge/publish-game-button";
import { ReturnToSessionLink } from "@/components/bridge/return-to-session-link";
import { RoomCodeCopy } from "@/components/bridge/room-code-copy";
import { SignOutButton } from "@/components/bridge/sign-out-button";
import { StartSessionButton } from "@/components/bridge/start-session-button";
import { pickLocalizedGameText } from "@/lib/game-content-i18n";
import { auth } from "@/lib/auth";
import { getCommunityGames, getHostOwnGames } from "@/server/games";
import { getHostActiveLiveSessions } from "@/server/sessions";
import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function BridgePage({ params }: Props) {
  const { locale } = await params;
  const session = await auth();
  const t = await getTranslations("bridge");

  if (!session?.user?.id) {
    redirect(`/${locale}/bridge/login`);
  }

  const [myGames, communityGames, activeLiveSessions] = await Promise.all([
    getHostOwnGames(session.user.id),
    getCommunityGames(session.user.id),
    getHostActiveLiveSessions(session.user.id),
  ]);

  const activeSessionByGameId = new Map(
    activeLiveSessions.map((liveSession) => [liveSession.gameId, liveSession]),
  );

  const hostLabel =
    session.user.name ?? session.user.username ?? t("defaultHostName");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-8 px-4 pb-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            {t("title")}
          </p>
          <h1 className="text-3xl font-bold">
            {t("dashboardTitle", { name: hostLabel })}
          </h1>
          <p className="text-muted">{t("subtitle")}</p>
        </div>
        <div className="flex items-start gap-2">
          <AccountButton username={session.user.username ?? hostLabel} />
          <SignOutButton />
        </div>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link
          href={`/${locale}/bridge/games/new`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-background hover:bg-accent-hover"
        >
          {t("createGame")}
        </Link>
      </div>

      {activeLiveSessions.length > 0 ? (
        <section className="space-y-4 rounded-2xl border border-accent/40 bg-accent/5 p-5">
          <h2 className="text-lg font-semibold">{t("activeSessions")}</h2>
          <p className="text-sm text-muted">{t("activeSessionsHint")}</p>
          <ul className="space-y-3">
            {activeLiveSessions.map((liveSession) => (
              <li
                key={liveSession.id}
                className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium">
                    {pickLocalizedGameText(
                      locale,
                      liveSession.game.titleRu,
                      liveSession.game.titleEn,
                    )}
                  </p>
                  <RoomCodeCopy
                    roomCode={liveSession.roomCode}
                    label={t("roomCodeLabel")}
                  />
                  <p className="text-sm text-muted">
                    {liveSession.phase === "ACTIVE"
                      ? t("sessionPhaseActive")
                      : t("sessionPhaseLobby")}
                    {" · "}
                    {t("sessionPlayerCount", {
                      count: liveSession._count.players,
                    })}
                  </p>
                </div>
                <ReturnToSessionLink
                  href={`/${locale}/bridge/session/${liveSession.id}`}
                  label={t("returnToSession")}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("myGames")}</h2>
        <p className="text-sm text-muted">{t("myGamesHint")}</p>
        {myGames.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
            {t("noGamesYet")}
          </p>
        ) : (
          <ul className="grid gap-4">
            {myGames.map((game) => (
              <li
                key={game.id}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {pickLocalizedGameText(
                        locale,
                        game.titleRu,
                        game.titleEn,
                      )}
                    </h3>
                    <p className="text-sm text-muted">
                      {pickLocalizedGameText(
                        locale,
                        game.descriptionRu,
                        game.descriptionEn,
                      )}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {game._count.scenes} scenes ·{" "}
                      {game.visibility === "PUBLIC"
                        ? t("visibilityPublic")
                        : t("visibilityPrivate")}{" "}
                      · {game.status.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    {game.visibility === "PRIVATE" ? (
                      <Link
                        href={`/${locale}/bridge/games/${game.id}/edit`}
                        className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border px-4 text-sm hover:border-accent"
                      >
                        {t("edit")}
                      </Link>
                    ) : null}
                    <DuplicateGameButton gameId={game.id} />
                    {game.visibility === "PRIVATE" ? (
                      <PublishGameButton
                        gameId={game.id}
                        sceneCount={game._count.scenes}
                      />
                    ) : null}
                    {activeSessionByGameId.get(game.id) ? (
                      <ReturnToSessionLink
                        href={`/${locale}/bridge/session/${activeSessionByGameId.get(game.id)!.id}`}
                        label={t("returnToSession")}
                      />
                    ) : (
                      <StartSessionButton
                        gameId={game.id}
                        sceneCount={game._count.scenes}
                      />
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("communityGames")}</h2>
        <p className="text-sm text-muted">{t("communityGamesHint")}</p>
        {communityGames.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted">
            {t("noCommunityGames")}
          </p>
        ) : (
          <ul className="grid gap-4">
            {communityGames.map((game) => {
              const authorLabel =
                game.host?.displayName ??
                game.host?.username ??
                t("unknownHost");

              return (
                <li
                  key={game.id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {pickLocalizedGameText(
                          locale,
                          game.titleRu,
                          game.titleEn,
                        )}
                      </h3>
                      <p className="text-sm text-muted">
                        {pickLocalizedGameText(
                          locale,
                          game.descriptionRu,
                          game.descriptionEn,
                        )}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {game._count.scenes} scenes ·{" "}
                        {t("sharedBy", { name: authorLabel })}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      <DuplicateGameButton gameId={game.id} />
                      {activeSessionByGameId.get(game.id) ? (
                        <ReturnToSessionLink
                          href={`/${locale}/bridge/session/${activeSessionByGameId.get(game.id)!.id}`}
                          label={t("returnToSession")}
                        />
                      ) : (
                        <StartSessionButton
                          gameId={game.id}
                          sceneCount={game._count.scenes}
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
