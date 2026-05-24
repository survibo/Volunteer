import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-full flex-col items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border border-border-default bg-surface-base p-6 text-center md:p-8">
            <h1 className="text-3xl font-bold leading-tight text-text-primary md:text-5xl">
              오류가 발생했습니다
            </h1>
            <p className="mt-4 text-sm text-text-secondary">
              페이지를 새로고침해 주세요.
            </p>
            <button
              className="mt-6 min-h-[44px] cursor-pointer rounded-xl bg-action-default px-6 font-semibold text-white hover:bg-action-hover"
              type="button"
              onClick={() => window.location.reload()}
            >
              새로고침
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
