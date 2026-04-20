import { Component, type ReactNode } from "react";
import { clearAutosave } from "@/persistence/autosave";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown): void {
    console.error("Uncaught render error:", error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReloadDiscardAutosave = () => {
    clearAutosave();
    window.location.reload();
  };

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-screen">
        <h1>Something went wrong.</h1>
        <p className="error-screen__message">{this.state.error.message}</p>
        <div className="error-screen__actions">
          <button type="button" className="btn btn--primary" onClick={this.handleReload}>
            Reload and restore autosave
          </button>
          <button type="button" className="btn" onClick={this.handleReloadDiscardAutosave}>
            Reload with a clean slate
          </button>
        </div>
      </div>
    );
  }
}
