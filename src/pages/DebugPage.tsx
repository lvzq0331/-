// 测试页面 - 用于调试路由问题
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function DebugPage() {
  const location = useLocation();
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const newLog = `页面访问: ${location.pathname} ${new Date().toLocaleTimeString()}`;
    setLogs(prev => [...prev, newLog]);
    console.log(newLog);
  }, [location]);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">路由调试页面</h1>
      <p className="mb-2">当前路径: <code className="bg-gray-100 px-2 py-1 rounded">{location.pathname}</code></p>
      <div className="mt-4">
        <h2 className="font-bold mb-2">访问日志:</h2>
        {logs.map((log, i) => (
          <div key={i} className="text-sm text-gray-600">{log}</div>
        ))}
      </div>
    </div>
  );
}
