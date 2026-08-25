'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import api from '@/lib/api';

function generateCaptcha() {
  const a = Math.floor(Math.random() * 20) + 1;
  const b = Math.floor(Math.random() * 20) + 1;
  const operators = ['+', '-'] as const;
  const op = operators[Math.floor(Math.random() * operators.length)];
  const answer = op === '+' ? a + b : a - b;
  return { question: `${a} ${op} ${b} = ?`, answer };
}

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, setMenu } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captcha, setCaptcha] = useState({ question: '', answer: 0 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<any>(null);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  }, []);

  useEffect(() => {
    refreshCaptcha();
    // Fetch company info for logo
    api.get('/master/company').then(res => {
      setCompany(res.data.data ?? res.data);
    }).catch(() => {});
  }, [refreshCaptcha]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate captcha
    if (parseInt(captchaInput, 10) !== captcha.answer) {
      setError('Captcha salah. Silakan coba lagi.');
      refreshCaptcha();
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      const data = response.data.data || response.data;
      const { accessToken, refreshToken, user } = data;

      setAuth(user, accessToken, refreshToken);

      // Fetch user permissions and menu
      try {
        const menuResponse = await api.get('/rbac/menu', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setMenu(menuResponse.data.data || menuResponse.data || []);
      } catch {
        // Menu fetch failed, continue to dashboard anyway
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      refreshCaptcha();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {company?.logo && <img src={company.logo} alt="Logo" className="h-16 mx-auto mb-2" />}
          <CardTitle className="text-2xl">{company?.companyName || 'Inventory & POS'}</CardTitle>
          <CardDescription>Login to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                placeholder="admin@inventorypos.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="captcha" className="text-sm font-medium">
                Captcha
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className="px-4 py-2 bg-muted rounded-md font-mono text-lg font-bold select-none tracking-wider">
                    {captcha.question}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={refreshCaptcha}
                    title="Refresh captcha"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  id="captcha"
                  type="number"
                  placeholder="Jawaban"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  className="w-28"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
