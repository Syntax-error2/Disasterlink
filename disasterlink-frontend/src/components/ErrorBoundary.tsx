import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-red-950 p-6 text-white overflow-auto">
          <AlertTriangle className="h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-black mb-2 text-center">App Crashed</h1>
          <p className="text-red-200 mb-4 text-center">Something went wrong while rendering this component.</p>
          <div className="bg-black/50 p-4 rounded-xl w-full font-mono text-xs overflow-x-auto text-left">
            <div className="text-red-400 font-bold mb-2">{this.state.error?.toString()}</div>
            <div className="text-zinc-400 whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</div>
          </div>
          <button 
            className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 rounded-full font-bold shadow-lg"
            onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
