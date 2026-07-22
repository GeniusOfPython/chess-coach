import type { DiagnosticProfile } from "../analysis/diagnosticProfile";
import "./OnboardingFlow.css";

type Props = {
  profile: DiagnosticProfile;
};

export default function DiagnosticProfilePanel({ profile }: Props) {
  return (
    <section className="diagnostic-profile-panel" aria-label="Диагностический профиль">
      <div>
        <span className="status-label">Стартовый профиль</span>
        <strong>{profile.levelLabel}</strong>
      </div>
      <dl>
        <div>
          <dt>Качество решений</dt>
          <dd>{profile.accuracy}%</dd>
        </div>
        <div>
          <dt>Оценено</dt>
          <dd>{profile.decisionCount}</dd>
        </div>
        <div>
          <dt>Ошибки</dt>
          <dd>{profile.mistakes + profile.blunders}</dd>
        </div>
      </dl>
      {profile.focusLabel && (
        <p>Приоритет: <strong>{profile.focusLabel}</strong></p>
      )}
      <p>{profile.nextStep}</p>
    </section>
  );
}
