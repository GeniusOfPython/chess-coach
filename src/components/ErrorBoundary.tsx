import { Component, type ErrorInfo, type ReactNode } from "react";
import { clearAppStorageValues } from "../platform/appStorage";
import { captureException } from "../platform/diagnostics/crashReporter";
import "./ErrorBoundary.css";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  reportId: string;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    reportId: "",
  };

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
      reportId: "",
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const report = captureException(error, {
      source: "react-boundary",
      componentStack: errorInfo.componentStack,
    });

    this.setState({ reportId: report.id });
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

          <h1>Не удалось продолжить работу</h1>

          <p>
            Скорее всего, сломалось состояние партии, импорт PGN/FEN или
            промежуточные сохранённые данные. Можно перезагрузить страницу
            или очистить сохранённые данные.
          </p>

          {this.state.reportId && (
            <pre className="error-boundary-message">
              Код диагностики: {this.state.reportId}
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
              Очистить сохранённые данные
            </button>
          </div>
        </section>
      </main>
    );
  }
}
