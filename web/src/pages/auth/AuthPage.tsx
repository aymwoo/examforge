import Button from '@/components/ui/Button';

export default function AuthPage() {
  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">登录</h1>

      <form className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">邮箱</label>
          <input
            type="email"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">密码</label>
          <input
            type="password"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="••••••••"
          />
        </div>

        <Button type="submit" className="w-full">
          登录
        </Button>
      </form>
    </div>
  );
}
