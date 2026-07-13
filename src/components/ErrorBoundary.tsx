import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearAppStorageValues } from "../platform/appStorage";
import "./ErrorBoundary.css";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  errorMessage: string;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    errorMessage: "",
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      errorMessage:
        error instanceof Error
          ? error.message
          : "Неизвестная ошибка приложения",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Ошибка приложения:", error);
    console.error("React stack:", errorInfo.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetLocalData = () => {
    clearAppStorageValues();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="error-boundary-page">
        <section className="error-boundary-card">
          <span className="error-boundary-label">
            Шахматный помощник
          </span>

          <h1>Приложение столкнулось с ошибкой</h1>

          <p>
            Скорее всего, сломалось состояние партии, импорт PGN/FEN или
            промежуточные сохранённые данные. Можно перезагрузить страницу
            или сбросить локальные данные приложения.
          </p>

          {this.state.errorMessage && (
            <pre className="error-boundary-message">
              {this.state.errorMessage}
            </pre>
          )}

          <div className="error-boundary-actions">
            <button type="button" onClick={this.handleReload}>
              Перезагрузить
            </button>

            <button
              type="button"
              className="secondary"
              onClick={this.handleResetLocalData}
            >
              Сбросить локальные данные
            </button>
          </div>
        </section>
      </main>
    );
  }
}
