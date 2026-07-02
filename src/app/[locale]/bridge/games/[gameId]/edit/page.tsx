import { BridgeBackLink } from "@/components/bridge/bridge-back-link";
import { GameEditor } from "@/components/bridge/game-editor";
import { pickLocalizedGameText } from "@/lib/game-content-i18n";
import { auth } from "@/lib/auth";
import { GameError, getEditableHostGame } from "@/server/games";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";

type Props = {
  params: Promise<{ locale: string; gameId: string }>;
};

export default async function EditGamePage({ params }: Props) {
  const { locale, gameId } = await params;
  const session = await auth();
  const t = await getTranslations("bridge");

  if (!session?.user?.id) {
    redirect(`/${locale}/bridge/login`);
  }

  let game;

  try {
    game = await getEditableHostGame(session.user.id, gameId);
  } catch (error) {
    if (error instanceof GameError && error.code === "NOT_EDITABLE") {
      redirect(`/${locale}/bridge`);
    }
    notFound();
  }

  const title = pickLocalizedGameText(locale, game.titleRu, game.titleEn);

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col gap-6 px-4 pb-8">
      <header className="space-y-2">
        <BridgeBackLink
          href={`/${locale}/bridge`}
          label={t("backToDashboard")}
        />
        <h1 className="text-2xl font-bold">{t("editGame")}</h1>
        <p className="text-muted">{title}</p>
      </header>

      <GameEditor
        gameId={game.id}
        titleRu={game.titleRu}
        titleEn={game.titleEn}
        descriptionRu={game.descriptionRu}
        descriptionEn={game.descriptionEn}
        heroSlots={game.heroSlots.map((slot) => ({
          labelRu: slot.labelRu,
          labelEn: slot.labelEn,
          strengthTraitRu: slot.strengthTraitRu,
          strengthTraitEn: slot.strengthTraitEn,
          strengthValue: slot.strengthValue,
          weaknessTraitRu: slot.weaknessTraitRu,
          weaknessTraitEn: slot.weaknessTraitEn,
          weaknessValue: slot.weaknessValue,
        }))}
        traits={game.traits.map((trait) => ({
          labelRu: trait.labelRu,
          labelEn: trait.labelEn,
        }))}
        traitPointsPerStat={game.traitPointsPerStat}
        defaultStrengthValue={game.defaultStrengthValue}
        defaultWeaknessValue={game.defaultWeaknessValue}
        masterNotes={game.masterNotes ?? ""}
        scenes={game.scenes}
      />
    </main>
  );
}
