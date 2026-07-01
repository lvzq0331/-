// ErrorBoundary — 错误边界组件（捕获渲染错误）
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('渲染错误:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold text-red-500 mb-4">页面渲染出错</h2>
          <p className="text-gray-600 mb-4">抱歉，页面遇到了错误。请尝试刷新页面或联系管理员。</p>
          {this.state.error && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg text-left">
              <p className="font-mono text-sm text-red-600">{this.state.error.toString()}</p>
            </div>
          )}
          <Button
            onClick={() => window.location.reload()}
            className="mt-4"
          >
            刷新页面
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
